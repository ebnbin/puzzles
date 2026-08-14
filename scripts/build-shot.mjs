import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { root, BASE, CHROMIUM } from './lib/pictures.mjs'

const OUT = path.join(root, 'docs')
const FILE = 'gallery.png'

const CARD = { theme: 'light', lang: 'en', width: 1200, height: 630 }
const CARD_OUT = path.join(root, 'public')
const CARD_FILE = 'og.png'

const SHOTS = [
  { theme: 'light', lang: 'en', width: 1280, height: 844 },
  { theme: 'dark', lang: 'zh', width: 390, height: 844 },
]
const SCALE = 1

const GAP = 32
const PLATE = '#8a8a8f'

const shot = async (browser, { theme, lang, width, height }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: SCALE,
    colorScheme: theme,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  await page.evaluate((want) => {
    localStorage.clear()
    localStorage.setItem('puzzles.theme', want.theme)
    localStorage.setItem('puzzles.lang', want.lang)
  }, { theme, lang })
  await page.goto('about:blank')
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.games img').length === 40 &&
      [...document.querySelectorAll('.games img')].every((i) => i.complete && i.naturalWidth),
    null,
    { timeout: 30000 },
  )
  await page.waitForTimeout(400)
  const png = await page.screenshot()
  await context.close()
  return png
}

const browser = await chromium.launch({ executablePath: CHROMIUM })
const shots = []
for (const spec of SHOTS) shots.push(await shot(browser, spec))

const page = await browser.newPage()
await page.goto('about:blank')
const composed = await page.evaluate(
  async ({ images, gap, plate, scale }) => {
    const loaded = await Promise.all(
      images.map(async (src) => {
        const image = new Image()
        image.src = src
        await image.decode()
        return image
      }),
    )
    const pad = gap * scale
    const total = loaded.reduce((sum, i) => sum + i.width, 0)
    const canvas = document.createElement('canvas')
    canvas.width = total + pad * (loaded.length + 1)
    canvas.height = Math.max(...loaded.map((i) => i.height)) + pad * 2
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = plate
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    let x = pad
    for (const image of loaded) {
      ctx.drawImage(image, x, pad)
      x += image.width + pad
    }
    return canvas.toDataURL('image/png')
  },
  {
    images: shots.map((b) => `data:image/png;base64,${b.toString('base64')}`),
    gap: GAP,
    plate: PLATE,
    scale: SCALE,
  },
)
const card = await shot(browser, CARD)
await browser.close()

fs.mkdirSync(OUT, { recursive: true })
const bytes = Buffer.from(composed.split(',')[1], 'base64')
fs.writeFileSync(path.join(OUT, FILE), bytes)
console.log(
  `docs/${FILE}  ${bytes.length} bytes  ` +
    SHOTS.map((s) => `${s.width}x${s.height} ${s.theme} ${s.lang}`).join(' + '),
)

fs.writeFileSync(path.join(CARD_OUT, CARD_FILE), card)
console.log(
  `public/${CARD_FILE}  ${card.length} bytes  ` +
    `${CARD.width}x${CARD.height} ${CARD.theme} ${CARD.lang}`,
)
