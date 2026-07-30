/**
 * Cut Undead's three monsters out of the board they are drawn on.
 *
 * The keypad needs a ghost, a vampire and a zombie on three of its keys, and
 * hand-drawn glyphs of them were never going to be the ones on the board. These
 * are: the same `draw_monster` in the same engine, rendered big and lifted off
 * its background.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT A CROP
 * ---------------------------------------------------------------------------
 *
 * A rectangle cut out of the board brings the board with it, and not only
 * around the edges: the whites of all three — the eyes, the vampire's fangs,
 * the zombie's open mouth — are painted in COL_BACKGROUND, because on
 * upstream's near-white board that is what white is. Keying the background out
 * by colour would take the fangs with it, and keeping it would put a grey plate
 * on every key.
 *
 * So the alpha is measured rather than guessed. The back end takes its
 * background from the page — `frontend_default_colour`, which this port answers
 * with the canvas's own CSS colour — and Undead derives all three skins from
 * that colour's *red* channel alone:
 *
 *     ret[COL_GHOST*3 + 0] = ret[COL_BACKGROUND*3 + 0] * 0.5F;
 *     ret[COL_GHOST*3 + 1] = ret[COL_BACKGROUND*3 + 0];
 *     ret[COL_GHOST*3 + 2] = ret[COL_BACKGROUND*3 + 0];
 *
 * Render twice with the same red and different green and blue, and every colour
 * in the drawing is identical between the two while the ground is not. Then for
 * a pixel that is ink over ground, `P = a*ink + (1-a)*ground`, and subtracting
 * the two renders leaves `a = 1 - (P1 - P2) / (g1 - g2)` — exact, including the
 * half-covered pixels along every edge, which is what a colour key can never
 * get and what makes the difference between a cut-out and a sprite.
 *
 * That leaves the eyes and fangs reading as ground, since that is what they are
 * made of. They are not outside, though, and outside is what should be
 * transparent — so the transparency is flood-filled in from the border, and
 * anything the fill cannot reach is put back opaque at the colour it was drawn.
 * The whites stay white and the key shows through only around the monster.
 *
 * ---------------------------------------------------------------------------
 *
 * One set of sprites serves both themes: the board draws these three the same
 * way up whatever the theme (see `FIGURE` in engine/palette.ts), so the key and
 * the board agree in either.
 *
 * Run against a preview server:
 *   npx vite preview --port 4173 &
 *   node scripts/build-monsters.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/monsters')
const BASE = process.env.PUZZLES_BASE ?? 'http://localhost:4173'

/**
 * The two grounds. Same red, so `game_colours` derives the same three skins
 * from both; wildly different green and blue, so the subtraction has something
 * to divide by.
 */
const GROUNDS = ['rgb(230, 230, 230)', 'rgb(230, 0, 0)']

/** What each monster is recognised by: its skin, as `game_colours` mixes it. */
const SKINS = {
  ghost: [115, 230, 230],
  zombie: [115, 230, 115],
  vampire: [230, 207, 207],
}

/** The sprite's longest side. Three times a 20px key, and a little over. */
const SIZE = 72

/** Rendered this big first, so the downscale has something to work with. */
const VIEWPORT = { width: 1100, height: 1400 }

async function render(browser, ground) {
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

  /*
   * The back end asks the page for its background once, when it names its
   * colours, and never again — so the style has to be up before the puzzle
   * starts. Hence the gallery: land there, dress the canvas that does not exist
   * yet, and walk into the puzzle, which is one screen away and boots with the
   * rule already in force. (An init script does not survive the document being
   * parsed, and a style added after the board is up is a repaint the back end
   * never hears about.)
   */
  await page.addStyleTag({ content: `.host-board { background-color: ${ground} !important }` })
  await page.click('.games [data-game="undead"]')
  await page.waitForFunction(
    () => document.querySelector('.play')?.dataset.ready === 'true',
    null,
    { timeout: 30000 },
  )
  await page.waitForTimeout(400)

  const shot = await page.evaluate(() => {
    const c = document.querySelector('canvas.host-board')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height)
    return { w: c.width, h: c.height, data: [...d.data] }
  })
  await context.close()
  return shot
}

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM ??
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})

const [a, b] = [await render(browser, GROUNDS[0]), await render(browser, GROUNDS[1])]
await browser.close()

if (a.w !== b.w || a.h !== b.h) throw new Error('the two renders came out different sizes')
const { w, h } = a
const ground = GROUNDS.map((css) => css.match(/\d+/g).map(Number))

/** Every pixel's alpha, from the pair of renders. */
const alpha = new Float32Array(w * h)
for (let i = 0; i < w * h; i++) {
  // Green and blue both carry the difference; averaging the two answers halves
  // the noise the canvas's own rounding puts into either.
  let sum = 0
  for (const c of [1, 2]) {
    const diff = a.data[i * 4 + c] - b.data[i * 4 + c]
    sum += 1 - diff / (ground[0][c] - ground[1][c])
  }
  alpha[i] = Math.min(1, Math.max(0, sum / 2))
}

/**
 * Outside is what the border can reach through transparency. The whites inside
 * a monster read as ground too, and this is what tells them apart from it.
 */
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

/**
 * One monster, found by its skin and then grown along everything it is drawn
 * with — which is what picks up the vampire's cap, black and sitting outside
 * the face it belongs to.
 *
 * Taken from the row of counters above the grid, and found by scanning
 * downwards so that is the one reached first. Up there each monster stands on
 * plain background with nothing else near it; among the squares it would be
 * touching the grid, and a fill that walks through anything opaque would walk
 * off along the lines and take the board with it.
 */
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

fs.mkdirSync(outDir, { recursive: true })
const written = []

for (const [name, skin] of Object.entries(SKINS)) {
  const [x0, y0, x1, y1] = findMonster(skin)
  const cw = x1 - x0
  const ch = y1 - y0
  const off = outside(x0, y0, x1, y1)

  const rgba = new Uint8ClampedArray(cw * ch * 4)
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const src = ((y + y0) * w + (x + x0)) * 4
      const dst = (y * cw + x) * 4
      // Inside the drawing, whatever the subtraction said: the whites are made
      // of ground and would otherwise punch through.
      const cover = off[y * cw + x] ? alpha[(y + y0) * w + (x + x0)] : 1
      rgba[dst] = a.data[src]
      rgba[dst + 1] = a.data[src + 1]
      rgba[dst + 2] = a.data[src + 2]
      rgba[dst + 3] = Math.round(cover * 255)
    }

  written.push({ name, cw, ch, rgba: [...rgba] })
  console.log(`  ${name.padEnd(8)} cut ${cw}x${ch} from ${w}x${h}`)
}

/*
 * Squared off and scaled down in a browser, which is the only image library
 * this project has — and the right one, since it is the same resampler the
 * page would have used on a bigger sprite.
 */
const page = await (async () => {
  const b2 = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM ??
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  })
  const p = await (await b2.newContext()).newPage()
  p.on('close', () => b2.close())
  return p
})()

for (const { name, cw, ch, rgba } of written) {
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
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'))
}

await page.close()
console.log(`\nwrote ${written.length} monsters to public/monsters`)
