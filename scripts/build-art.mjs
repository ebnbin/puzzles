import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { BASE, CHROMIUM, cornerColour, freshDir, openBoard, outFile, root, THEMES } from './lib/pictures.mjs'

const outDir = path.join(root, 'public/art')

// 两个底色的红通道必须相同(三种皮肤全部只由背景的红导出,SKINS 按红=230 算),
// 绿蓝要差得远供减法除;动 GROUNDS 必须同步重算 SKINS。
const GROUNDS = ['rgb(230, 230, 230)', 'rgb(230, 0, 0)']

const SKINS = {
  ghost: [115, 230, 230],
  zombie: [115, 230, 115],
  vampire: [230, 207, 207],
}

const SIZE = 48

const VIEWPORT = { width: 1100, height: 1400 }

const grab = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas.host-board')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height)
    return { w: c.width, h: c.height, data: [...d.data] }
  })

// 后端只在启动报色时读一次页面背景(frontend_default_colour):强制背景必须在
// 进谜题前生效——先落画廊、addStyleTag,再点进 undead;棋盘起来后再加样式后端听不见。
async function renderOn(browser, ground) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: 'light',
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('puzzles.theme', 'light')
  })
  await page.goto('about:blank')
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('.games .games-tile')
  await page.addStyleTag({ content: `.host-board { background-color: ${ground} !important }` })
  await page.click('.games [data-game="undead"]')
  await page.waitForFunction(() => document.querySelector('.play')?.dataset.ready === 'true', null, {
    timeout: 30000,
  })
  await page.waitForTimeout(400)
  const shot = await grab(page)
  await context.close()
  return shot
}

const browser = await chromium.launch({ executablePath: CHROMIUM })

const [a, b] = [await renderOn(browser, GROUNDS[0]), await renderOn(browser, GROUNDS[1])]
if (a.w !== b.w || a.h !== b.h) throw new Error('the two renders came out different sizes')
const { w, h } = a

const painted = {}
for (const theme of THEMES) {
  const { context, page } = await openBoard(browser, { game: 'undead', theme, viewport: VIEWPORT })
  const shot = await grab(page)
  if (shot.w !== w || shot.h !== h)
    throw new Error(`${theme} board is ${shot.w}x${shot.h}, alpha was measured at ${w}x${h}`)
  painted[theme] = { ...shot, board: (await cornerColour(page)).match(/\w\w/g).map((v) => parseInt(v, 16)) }
  await context.close()
}
await browser.close()

const ground = GROUNDS.map((css) => css.match(/\d+/g).map(Number))

const alpha = new Float32Array(w * h)
for (let i = 0; i < w * h; i++) {
  let sum = 0
  for (const c of [1, 2]) {
    const diff = a.data[i * 4 + c] - b.data[i * 4 + c]
    sum += 1 - diff / (ground[0][c] - ground[1][c])
  }
  alpha[i] = Math.min(1, Math.max(0, sum / 2))
}

function outside(x0, y0, x1, y1) {
  const seen = new Uint8Array((x1 - x0) * (y1 - y0))
  const stack = []
  const put = (x, y) => {
    if (x < x0 || y < y0 || x >= x1 || y >= y1) return
    const k = (y - y0) * (x1 - x0) + (x - x0)
    if (seen[k] || alpha[y * w + x] > 0.02) return
    seen[k] = 1
    stack.push(x, y)
  }
  for (let x = x0; x < x1; x++) {
    put(x, y0)
    put(x, y1 - 1)
  }
  for (let y = y0; y < y1; y++) {
    put(x0, y)
    put(x1 - 1, y)
  }
  while (stack.length) {
    const y = stack.pop()
    const x = stack.pop()
    put(x + 1, y)
    put(x - 1, y)
    put(x, y + 1)
    put(x, y - 1)
  }
  return seen
}

function findMonster([r, g, bl]) {
  let start = -1
  for (let i = 0; i < w * h && start < 0; i++)
    if (a.data[i * 4] === r && a.data[i * 4 + 1] === g && a.data[i * 4 + 2] === bl) start = i
  if (start < 0) throw new Error('not on the board')

  const seen = new Uint8Array(w * h)
  const stack = [start % w, Math.floor(start / w)]
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  let n = 0
  while (stack.length) {
    const y = stack.pop()
    const x = stack.pop()
    if (x < 0 || y < 0 || x >= w || y >= h) continue
    const k = y * w + x
    if (seen[k] || alpha[k] <= 0.02) continue
    seen[k] = 1
    if (++n > w * h) throw new Error('the fill ran away')
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }
  return [Math.max(0, x0 - 2), Math.max(0, y0 - 2), Math.min(w, x1 + 3), Math.min(h, y1 + 3)]
}

freshDir(outDir)
const cut = []

for (const [name, skin] of Object.entries(SKINS)) {
  const [x0, y0, x1, y1] = findMonster(skin)
  const cw = x1 - x0
  const ch = y1 - y0
  const off = outside(x0, y0, x1, y1)

  for (const theme of THEMES) {
    const { data, board } = painted[theme]
    const rgba = new Uint8ClampedArray(cw * ch * 4)
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const src = ((y + y0) * w + (x + x0)) * 4
        const dst = (y * cw + x) * 4
        const cover = off[y * cw + x] ? alpha[(y + y0) * w + (x + x0)] : 1
        for (let c = 0; c < 3; c++) {
          rgba[dst + c] =
            cover > 0.02 ? (data[src + c] - (1 - cover) * board[c]) / cover : data[src + c]
        }
        rgba[dst + 3] = Math.round(cover * 255)
      }
    cut.push({ name, theme, cw, ch, rgba: [...rgba] })
  }
  console.log(`  ${name.padEnd(8)} cut ${cw}x${ch} from ${w}x${h}`)
}

const b2 = await chromium.launch({ executablePath: CHROMIUM })
const page = await (await b2.newContext()).newPage()

for (const { name, theme, cw, ch, rgba } of cut) {
  const url = await page.evaluate(
    ({ cw, ch, rgba, size }) => {
      const src = document.createElement('canvas')
      src.width = cw
      src.height = ch
      src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), cw, ch), 0, 0)

      const out = document.createElement('canvas')
      out.width = out.height = size
      const ctx = out.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      const scale = Math.min(size / cw, size / ch)
      const dw = cw * scale
      const dh = ch * scale
      ctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh)
      return out.toDataURL('image/png')
    },
    { cw, ch, rgba, size: SIZE },
  )
  fs.writeFileSync(outFile(outDir, name, theme), Buffer.from(url.split(',')[1], 'base64'))
}

await b2.close()
console.log(`\nwrote ${cut.length} sprites to public/art`)
