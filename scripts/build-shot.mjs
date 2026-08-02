/**
 * The picture in the README: the gallery on a desktop, and on a phone beside it.
 *
 * Two shots at one height, so they sit together without either being scaled to
 * fit the other. They differ in every way this screen can differ: a desktop
 * window and a phone, light and dark, English and Chinese. Three facts about it
 * in one picture, and none of them needing a caption.
 *
 * A screenshot is a generated artefact like every other picture here, so it is
 * taken by a script rather than by hand. Not for tidiness — a shot taken by
 * hand is a shot nobody can retake the same way. This one fixes the things that
 * would otherwise drift between one and the next: the sizes, the languages, the
 * scroll position, and above all an empty store, so the gallery is the one a
 * visitor sees on their first load and not one wearing whatever was left over
 * from testing — a ring on some puzzle, four games in the stash.
 *
 * At one device pixel per CSS pixel, deliberately. The composed image comes out
 * about 1750 wide, GitHub lays a README out at about 880, so a browser on a
 * retina display asks for very nearly exactly these pixels. Doubling would
 * quadruple the file for nothing anyone would see.
 *
 * Output is docs/, not public/: this is for the repository page and has no
 * business being deployed with the app.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { root, BASE, CHROMIUM, dealIconPosition, readRedos } from './lib/pictures.mjs'

const OUT = path.join(root, 'docs')
const FILE = 'gallery.png'

/**
 * A desktop window and a phone, sharing a height so neither has to be resized
 * to stand beside the other.
 */
const SHOTS = [
  { theme: 'light', lang: 'en', width: 1280, height: 844 },
  // A board rather than the gallery again, and the same board its own tile in
  // the gallery is a picture of: upstream's saved position for Net, restored
  // move for move. The two halves of this image are then the two screens this
  // app has, rather than one screen twice.
  { theme: 'dark', lang: 'zh', width: 390, height: 844, game: 'net' },
]
const SCALE = 1

/** The gap between the two, and the ground behind them. */
const GAP = 32
const PLATE = '#8a8a8f'

const redos = readRedos()

const shot = async (browser, { theme, lang, width, height, game }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: SCALE,
    colorScheme: theme,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  // A first visit, with nothing remembered — except, for a board, which puzzle
  // to open and that it has already introduced itself, since the how-to dialog
  // would otherwise be sitting over the thing being photographed.
  await page.evaluate((want) => {
    localStorage.clear()
    localStorage.setItem('puzzles.theme', want.theme)
    localStorage.setItem('puzzles.lang', want.lang)
    if (want.game) {
      localStorage.setItem('puzzles.recent', want.game)
      localStorage.setItem('puzzles.playing', '1')
      localStorage.setItem('puzzles.introduced', JSON.stringify([want.game]))
    }
  }, { theme, lang, game })
  await page.goto('about:blank')
  await page.goto(BASE, { waitUntil: 'load' })
  if (game) {
    await page.waitForFunction(() => document.querySelector('.host-board')?.width > 0, null, {
      timeout: 30000,
    })
    await dealIconPosition(page, { game, redos })
  } else {
    // Every thumbnail decoded, or the shot catches the grey plates under them.
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.games img').length === 40 &&
        [...document.querySelectorAll('.games img')].every((i) => i.complete && i.naturalWidth),
      null,
      { timeout: 30000 },
    )
  }
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
await browser.close()

fs.mkdirSync(OUT, { recursive: true })
const bytes = Buffer.from(composed.split(',')[1], 'base64')
fs.writeFileSync(path.join(OUT, FILE), bytes)
console.log(
  `docs/${FILE}  ${bytes.length} bytes  ` +
    SHOTS.map((s) => `${s.width}x${s.height} ${s.theme} ${s.lang} ${s.game ?? 'gallery'}`).join(' + '),
)
