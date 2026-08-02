/**
 * The picture at the top of the how-to-play dialog, for every puzzle, in both
 * themes.
 *
 * The launcher's thumbnail is a close crop of a position upstream picked
 * (icons/<game>.sav, see build-tiles.mjs). This is the other picture of that
 * same puzzle: the whole board, and — wherever the puzzle can be finished —
 * finished. That is what the reader is being asked to arrive at, which is what
 * instructions want to show and what a crop of a half-played grid cannot.
 *
 * Same puzzle as the thumbnail, reached without going through the interface:
 * load the saved position and restart it. `restart` winds that same game back
 * to its opening, which is what typing its id in would also have dealt — and it
 * keeps the `aux` the position was generated with, which netslide and untangle
 * refuse to solve without and a typed id does not carry.
 *
 * Then Solve. Six puzzles come out as the deal instead, and the log says which:
 *
 *  - cube, samegame and pegs declare `can_solve` false upstream, so nothing
 *    happens and the board says so.
 *  - flood, inertia and flip have solvers that hand you the answer to carry out
 *    rather than carrying it out. "This is a solve move, so we don't actually
 *    _change_ the grid but merely set up a stored solution path" (flood.c);
 *    inertia stores the same kind of route; flip sets `hints_active` and rings
 *    the squares to press. Asked and then followed to the end, those three
 *    finish as one flat colour, as a board with nothing left to collect, and as
 *    twenty-five identical squares — every one a worse picture of its puzzle
 *    than the deal. So they are not asked.
 *
 * Those six get exactly the thumbnail's position — the save, plus the redo
 * frame where there is one — but the whole board rather than the crop. Every
 * puzzle has a picture; what differs is whether it is finished.
 *
 * Square, and padded rather than cropped: the board is scaled to fit and the
 * rest is filled with the board's own edge colour, so a puzzle half as wide as
 * it is tall keeps all of itself and still takes the same bite out of the
 * dialog as a square one. That also retires the old rule that these could not
 * sit on a plate because the forty do not agree on a background — each now
 * brings its own.
 *
 * Run against a preview server, all forty or a few by name:
 *   npx vite preview --port 4173 &
 *   node scripts/build-howto.mjs
 *   node scripts/build-howto.mjs net solo mines
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import {
  CHROMIUM,
  cornerColour,
  dealIconPosition,
  freshDir,
  games,
  openBoard,
  outFile,
  readRedos,
  root,
  savePath,
  square,
  THEMES,
} from './lib/pictures.mjs'

const outDir = path.join(root, 'public/howto')
/** Twice the 162px the dialog draws it at. */
const SIZE = 324

/**
 * Puzzles whose Solve shows the answer rather than applying it — see the head
 * of this file. Asking is worse than not asking: it would draw a route or a
 * ring of hints over a board no nearer solved than the deal.
 */
const SOLVE_ONLY_SHOWS = new Set(['flood', 'inertia', 'flip'])

/** What is on the board right now, as something comparable. */
const board = (page) =>
  page.evaluate(() => document.querySelector('.host-board').toDataURL())

const only = process.argv.slice(2)
const list = games().filter((g) => !only.length || only.includes(g.name))
const redos = readRedos()

const browser = await chromium.launch({ executablePath: CHROMIUM })
if (only.length) fs.mkdirSync(outDir, { recursive: true })
else freshDir(outDir)

const how = {}
let failed = 0
let wrote = 0

for (const game of list) {
  if (!fs.existsSync(savePath(game.name))) {
    console.error(`  ${game.name.padEnd(10)} no saved position upstream`)
    failed++
    continue
  }

  for (const theme of THEMES) {
    const { context, page, errors } = await openBoard(browser, { game: game.name, theme })
    try {
      let note
      if (SOLVE_ONLY_SHOWS.has(game.name)) {
        // The thumbnail's position exactly, including its redo frame.
        await dealIconPosition(page, { game: game.name, redos })
        note = 'as dealt (shown only)'
      } else {
        await page.evaluate(
          (text) => window.__puzzle.loadGame(text),
          fs.readFileSync(savePath(game.name), 'utf8'),
        )
        await page.waitForTimeout(400)
        await page.evaluate(() => window.__puzzle.restart())
        await page.waitForTimeout(300)

        const before = await board(page)
        await page.evaluate(() => window.__puzzle.solve())
        await page.waitForFunction(() => !window.__animating, null, { timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(300)

        if ((await board(page)) === before) {
          /*
           * Told by the board rather than by the error, which is the same
           * question asked of the thing being photographed: a solve that
           * changes no pixel solved nothing. Fall back to the thumbnail's
           * position, whole rather than cropped.
           */
          await dealIconPosition(page, { game: game.name, redos })
          note = 'as dealt (no solver)'
        } else {
          note = 'solved'
        }
      }

      const shot = await page.locator('.host-board').screenshot()
      const pad = await cornerColour(page)
      fs.writeFileSync(
        outFile(outDir, game.name, theme),
        await square(page, shot, { size: SIZE, pad }),
      )
      wrote++

      if (theme === 'light') {
        how[game.name] = note
        const size = await page.evaluate(() => {
          const c = document.querySelector('.host-board')
          return `${c.width}x${c.height}`
        })
        console.log(`  ${game.name.padEnd(10)} ${size.padEnd(9)} ${note}`)
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

/*
 * How each picture was reached, beside the pictures themselves. Whether a board
 * is finished or merely dealt is the one thing about these that the file itself
 * does not say, and a rebuild of one puzzle should not lose what the other
 * thirty-nine did.
 */
if (Object.keys(how).length) {
  const file = path.join(outDir, 'how.json')
  const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const merged = Object.fromEntries(
    games()
      .map((g) => [g.name, how[g.name] ?? kept[g.name]])
      .filter(([, v]) => v),
  )
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`)
}

console.log(`\nwrote ${wrote} pictures to public/howto`)
if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
