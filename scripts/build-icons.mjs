/**
 * Render a thumbnail for every puzzle.
 *
 * Upstream ships the ingredients rather than the pictures: icons/<game>.sav is
 * a position Simon picked as representative, and icons/icons.cmake gives the
 * corner of the board worth showing — the icons are close crops, not whole
 * boards. Its own build renders these through a purpose-built GTK binary; we
 * already have the puzzles running in a browser, so they are rendered through
 * the same engine the site uses.
 *
 * The crop is applied proportionally rather than in pixels. icons.cmake states
 * the size it expects the board to be, so the rectangle can be scaled to
 * whatever size we render at — which also means the thumbnails come out
 * sharper than upstream's.
 *
 * Run through scripts/build-games.sh, or on its own against a preview server:
 *   npx vite preview --port 4173 &
 *   node scripts/build-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(root, 'vendor/sgtpuzzles/icons')
const outDir = path.join(root, 'public/icons')
const BASE = process.env.PUZZLES_BASE ?? 'http://localhost:4173'
/** Every icon comes out this square, whatever the crop it was taken from. */
const SIZE = 256

/** `set(net_crop 193x193 113x113+0+80)` → the reference size and the rectangle. */
function readCrops() {
  const text = fs.readFileSync(path.join(iconsDir, 'icons.cmake'), 'utf8')
  const crops = new Map()
  for (const [, name, rw, rh, cw, ch, cx, cy] of text.matchAll(
    /set\((\w+)_crop (\d+)x(\d+) (\d+)x(\d+)\+(\d+)\+(\d+)\)/g,
  )) {
    crops.set(name, {
      ref: { w: +rw, h: +rh },
      rect: { w: +cw, h: +ch, x: +cx, y: +cy },
    })
  }
  return crops
}

/**
 * Puzzles whose interesting moment is mid-move. Upstream redoes one move and
 * freezes the animation this far through it.
 */
function readRedos() {
  const text = fs.readFileSync(path.join(iconsDir, 'icons.cmake'), 'utf8')
  return new Map(
    [...text.matchAll(/set\((\w+)_redo ([\d.]+)\)/g)].map(([, n, p]) => [n, +p]),
  )
}

const games = JSON.parse(fs.readFileSync(path.join(root, 'src/games.json'), 'utf8'))
const crops = readCrops()
const redos = readRedos()

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM ??
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
})
fs.mkdirSync(outDir, { recursive: true })

let failed = 0
for (const game of games) {
  const savePath = path.join(iconsDir, `${game.name}.sav`)
  if (!fs.existsSync(savePath)) {
    console.error(`${game.name}: no saved position upstream`)
    failed++
    continue
  }
  const save = fs.readFileSync(savePath, 'utf8')
  const context = await browser.newContext({
    viewport: { width: 900, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  try {
    await page.goto(`${BASE}/ts/${game.name}`, { waitUntil: 'load' })
    await page.waitForSelector('.host-board', { timeout: 30000 })
    await page.waitForFunction(
      () => {
        const c = document.querySelector('.host-board')
        return c && c.width > 0
      },
      { timeout: 30000 },
    )
    await page.waitForTimeout(500)

    await page.evaluate((text) => window.__puzzle.loadGame(text), save)
    await page.waitForTimeout(400)

    const proportion = redos.get(game.name)
    if (proportion !== undefined) {
      // Take the clock off requestAnimationFrame, then find how long the
      // animation lasts by stepping until the puzzle stops asking for frames.
      // Replay it and jump straight to the wanted fraction, so the frame is
      // the same on every build.
      const duration = await page.evaluate(async (p) => {
        const api = window.__puzzle
        api.redo()
        api.stopTimer()
        let t = 0
        while (window.__animating && t < 5) {
          api.tick(0.01)
          t += 0.01
        }
        return t
      }, proportion)
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
    }

    const board = await page.evaluate(() => {
      const c = document.querySelector('.host-board')
      return { w: c.width, h: c.height }
    })

    const crop = crops.get(game.name)
    let clip
    if (crop) {
      // The reference aspect ratio must still hold, or the rectangle no longer
      // points at what it was chosen to point at.
      const refRatio = crop.ref.w / crop.ref.h
      const gotRatio = board.w / board.h
      if (Math.abs(refRatio - gotRatio) > 0.02) {
        throw new Error(
          `board is ${board.w}x${board.h}, crop expects the shape of ${crop.ref.w}x${crop.ref.h}`,
        )
      }
      const sx = board.w / crop.ref.w
      const sy = board.h / crop.ref.h
      const box = await page.locator('.host-board').boundingBox()
      const css = board.w / box.width
      clip = {
        x: box.x + (crop.rect.x * sx) / css,
        y: box.y + (crop.rect.y * sy) / css,
        width: (crop.rect.w * sx) / css,
        height: (crop.rect.h * sy) / css,
      }
    }

    const shot = await page.screenshot({
      clip: clip ?? (await page.locator('.host-board').boundingBox()),
    })

    // The crops are all different sizes; square them off so the launcher can
    // lay them out, and so a puzzle with a big board does not ship a big file.
    const square = await page.evaluate(
      async ({ data, size }) => {
        const image = new Image()
        image.src = data
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        // Letterbox rather than stretch: a few boards are not square.
        const scale = Math.min(size / image.width, size / image.height)
        const w = image.width * scale
        const h = image.height * scale
        ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
        return canvas.toDataURL('image/png')
      },
      { data: `data:image/png;base64,${shot.toString('base64')}`, size: SIZE },
    )
    fs.writeFileSync(
      path.join(outDir, `${game.name}.png`),
      Buffer.from(square.split(',')[1], 'base64'),
    )

    const note = crop ? `crop ${crop.rect.w}x${crop.rect.h}+${crop.rect.x}+${crop.rect.y}` : 'whole board'
    console.log(
      `  ${game.name.padEnd(10)} ${String(board.w).padStart(3)}x${board.h} ${note}` +
        (proportion !== undefined ? ` redo ${proportion}` : ''),
    )
    if (errors.length) throw new Error(errors[0])
  } catch (error) {
    console.error(`  ${game.name.padEnd(10)} FAILED: ${error.message}`)
    failed++
  }
  await context.close()
}

await browser.close()

console.log(`\nwrote ${games.length - failed} icons to public/icons`)
if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
