/**
 * Render a thumbnail for every puzzle, in both themes.
 *
 * Upstream ships the ingredients rather than the pictures: its own
 * icons/<game>.sav is a position Simon picked as representative, and
 * icons/icons.cmake gives the corner of the board worth showing — these are
 * close crops, not whole boards. Its own build renders them through a
 * purpose-built GTK binary; we already have the puzzles running in a browser,
 * so they are rendered through the same engine the site uses.
 *
 * They land in public/tiles/ and not public/icons/, which is the app's own icon
 * and one file rather than forty. Upstream's directory keeps its name because
 * it is upstream's; ours says what the gallery calls them.
 *
 * The crop is applied proportionally rather than in pixels. icons.cmake states
 * the size it expects the board to be, so the rectangle can be scaled to
 * whatever size we render at — which also means the thumbnails come out
 * sharper than upstream's.
 *
 * Two of each, `<game>-light.png` and `<game>-dark.png`. The dark board is a
 * different palette rather than a filter, so the launcher cannot be handed one
 * set and left to dim it.
 *
 * Run through scripts/build-games.sh, or on its own against a preview server:
 *   npx vite preview --port 4173 &
 *   node scripts/build-tiles.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import {
  boardSize,
  CHROMIUM,
  cornerColour,
  dealIconPosition,
  freshDir,
  games,
  openBoard,
  outFile,
  readCrops,
  readRedos,
  root,
  savePath,
  square,
  THEMES,
} from './lib/pictures.mjs'

const outDir = path.join(root, 'public/tiles')
/** Every tile comes out this square, whatever the crop it was taken from. */
const SIZE = 256

const list = games()
const crops = readCrops()
const redos = readRedos()

const browser = await chromium.launch({ executablePath: CHROMIUM })
freshDir(outDir)

let failed = 0
let wrote = 0
for (const game of list) {
  if (!fs.existsSync(savePath(game.name))) {
    console.error(`${game.name}: no saved position upstream`)
    failed++
    continue
  }

  for (const theme of THEMES) {
    const { context, page, errors } = await openBoard(browser, { game: game.name, theme })
    try {
      const { proportion } = await dealIconPosition(page, { game: game.name, redos })
      const board = await boardSize(page)

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
      const pad = await cornerColour(page)
      fs.writeFileSync(outFile(outDir, game.name, theme), await square(page, shot, { size: SIZE, pad }))
      wrote++

      if (theme === 'light') {
        const note = crop
          ? `crop ${crop.rect.w}x${crop.rect.h}+${crop.rect.x}+${crop.rect.y}`
          : 'whole board'
        console.log(
          `  ${game.name.padEnd(10)} ${String(board.w).padStart(3)}x${board.h} ${note}` +
            (proportion !== undefined ? ` redo ${proportion}` : ''),
        )
      }
      if (errors.length) throw new Error(errors[0])
    } catch (error) {
      console.error(`  ${game.name.padEnd(10)} ${theme}: FAILED: ${error.message}`)
      failed++
    }
    await context.close()
  }
}

await browser.close()

console.log(`\nwrote ${wrote} tiles to public/tiles`)
if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
