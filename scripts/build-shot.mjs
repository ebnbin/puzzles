/**
 * The picture in the README: the gallery, light beside dark.
 *
 * A screenshot is a generated artefact like every other picture here, so it is
 * taken by a script rather than by hand. Not for tidiness — a shot taken by
 * hand is a shot nobody can retake the same way. This one fixes the things that
 * would otherwise drift between one and the next: the width, the language, the
 * scroll position, and above all an empty store, so the gallery is the one a
 * visitor sees on their first load and not one wearing whatever was left over
 * from testing — a ring on some puzzle, four games in the stash.
 *
 * Light and dark in one image because the two are the same screenshot with one
 * setting moved, and putting them side by side says that in the space a caption
 * would need.
 *
 * Output is docs/, not public/: this is for the repository page and has no
 * business being deployed with the app.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { root, BASE, CHROMIUM } from './lib/pictures.mjs'

const OUT = path.join(root, 'docs')
const FILE = 'gallery.png'

/** A phone, which is what this app is shaped for. */
const VIEW = { width: 390, height: 780 }
const SCALE = 2

/** The gap between the two, and the ground behind them. */
const GAP = 32
const PLATE = '#8a8a8f'

const shot = async (browser, theme) => {
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: SCALE,
    colorScheme: theme,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  // A first visit, in Chinese, with nothing remembered.
  await page.evaluate((want) => {
    localStorage.clear()
    localStorage.setItem('puzzles.theme', want)
    localStorage.setItem('puzzles.lang', 'zh')
  }, theme)
  await page.goto('about:blank')
  await page.goto(BASE, { waitUntil: 'load' })
  // Every thumbnail decoded, or the shot catches the grey plates under them.
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
for (const theme of ['light', 'dark']) shots.push(await shot(browser, theme))

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
    const w = loaded[0].width
    const h = loaded[0].height
    const canvas = document.createElement('canvas')
    canvas.width = w * loaded.length + gap * scale * (loaded.length + 1)
    canvas.height = h + gap * scale * 2
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = plate
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    loaded.forEach((image, i) => {
      ctx.drawImage(image, gap * scale + i * (w + gap * scale), gap * scale)
    })
    return canvas.toDataURL('image/png')
  },
  {
    images: shots.map((b) => `data:image/png;base64,${b.toString('base64')}`),
    gap: GAP,
    plate: PLATE,
    scale: SCALE,
  },
)
await browser.close()

fs.mkdirSync(OUT, { recursive: true })
const bytes = Buffer.from(composed.split(',')[1], 'base64')
fs.writeFileSync(path.join(OUT, FILE), bytes)
console.log(`docs/${FILE}  ${bytes.length} bytes  (gallery, light and dark, ${VIEW.width}px wide at ${SCALE}x)`)
