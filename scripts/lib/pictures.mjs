import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const upstreamIcons = path.join(root, 'vendor/sgtpuzzles/icons')
export const BASE = process.env.PUZZLES_BASE ?? 'http://localhost:4173'
export const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export const THEMES = ['light', 'dark']

export const games = () =>
  JSON.parse(fs.readFileSync(path.join(root, 'src/games.json'), 'utf8'))

export function readCrops() {
  const text = fs.readFileSync(path.join(upstreamIcons, 'icons.cmake'), 'utf8')
  const crops = new Map()
  for (const [, name, rw, rh, cw, ch, cx, cy] of text.matchAll(
    /set\((\w+)_crop (\d+)x(\d+) (\d+)x(\d+)\+(\d+)\+(\d+)\)/g,
  )) {
    crops.set(name, { ref: { w: +rw, h: +rh }, rect: { w: +cw, h: +ch, x: +cx, y: +cy } })
  }
  return crops
}

export function readRedos() {
  const text = fs.readFileSync(path.join(upstreamIcons, 'icons.cmake'), 'utf8')
  return new Map(
    [...text.matchAll(/set\((\w+)_redo ([\d.]+)\)/g)].map(([, n, p]) => [n, +p]),
  )
}

export const savePath = (game) => path.join(upstreamIcons, `${game}.sav`)

export async function openBoard(browser, { game, theme, viewport = { width: 900, height: 900 } }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: theme })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'load' })
  await page.evaluate(
    ({ name, want }) => {
      localStorage.clear()
      localStorage.setItem('puzzles.recent', name)
      localStorage.setItem('puzzles.playing', '1')
      // 主题必须写 puzzles.theme:app 自己解析主题、不问系统,context 的
      // colorScheme 对它无效,漏写则暗色图静默拍成亮图。introduced 要预置,
      // 否则首访的介绍浮层会被拍进棋盘。
      localStorage.setItem('puzzles.theme', want)
      localStorage.setItem('puzzles.introduced', JSON.stringify([name]))
    },
    { name: game, want: theme },
  )
  // 写完 localStorage 必须经 about:blank 再回来:对同一地址的第二次 goto
  // 不会重新加载,种下的状态到不了 app。
  await page.goto('about:blank')
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.host-board')?.width > 0, null, {
    timeout: 30000,
  })
  await page.waitForTimeout(500)
  return { context, page, errors }
}

export async function dealIconPosition(page, { game, redos }) {
  const save = fs.readFileSync(savePath(game), 'utf8')
  await page.evaluate((text) => window.__puzzle.loadGame(text), save)
  await page.waitForTimeout(400)

  const proportion = redos.get(game)
  if (proportion === undefined) return { proportion }

  const duration = await page.evaluate(async () => {
    const api = window.__puzzle
    api.redo()
    api.stopTimer()
    let t = 0
    while (window.__animating && t < 5) {
      api.tick(0.01)
      t += 0.01
    }
    return t
  })
  await page.evaluate((text) => window.__puzzle.loadGame(text), save)
  await page.waitForTimeout(300)
  await page.evaluate(
    ({ d, p }) => {
      const api = window.__puzzle
      api.redo()
      api.stopTimer()
      api.tick(d * p)
    },
    { d: duration, p: proportion },
  )
  await page.waitForTimeout(200)
  return { proportion }
}

export const boardSize = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.host-board')
    return { w: c.width, h: c.height }
  })

// 补方底色取棋盘左上角的实际像素,不能查调色板:Untangle 的角是外边距 #e6e6e6
// 而非它的 COL_BACKGROUND #bbbbbb,查表会在缩略图两侧露缝。
export const cornerColour = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('.host-board').getContext('2d').getImageData(0, 0, 1, 1).data
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  })

export async function square(page, shot, { size, pad }) {
  const url = await page.evaluate(
    async ({ data, size, pad }) => {
      const image = new Image()
      image.src = data
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = pad
      ctx.fillRect(0, 0, size, size)
      ctx.imageSmoothingQuality = 'high'
      const scale = Math.min(size / image.width, size / image.height)
      const w = image.width * scale
      const h = image.height * scale
      ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
      return canvas.toDataURL('image/png')
    },
    { data: `data:image/png;base64,${shot.toString('base64')}`, size, pad },
  )
  return Buffer.from(url.split(',')[1], 'base64')
}

export const outFile = (dir, name, theme) => path.join(dir, `${name}-${theme}.png`)

export function freshDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}
