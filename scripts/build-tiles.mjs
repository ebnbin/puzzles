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
        const refRatio = crop.ref.w / crop.ref.h
        const gotRatio = board.w / board.h
        if (Math.abs(refRatio - gotRatio) > 0.02) {
          throw new Error(
            `board is ${board.w}x${board.h}, crop expects the shape of ${crop.ref.w}x${crop.ref.h}`,
          )
        }
        const sx = board.w / crop.ref.w
        const sy = board.h / crop.ref.h
        const box = await page.locator('.puzzle-canvas').boundingBox()
        const css = board.w / box.width
        clip = {
          x: box.x + (crop.rect.x * sx) / css,
          y: box.y + (crop.rect.y * sy) / css,
          width: (crop.rect.w * sx) / css,
          height: (crop.rect.h * sy) / css,
        }
      }

      const shot = await page.screenshot({
        clip: clip ?? (await page.locator('.puzzle-canvas').boundingBox()),
      })
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
