/**
 * Render a finished board for every puzzle.
 *
 * The gallery's thumbnails are close crops of a position upstream picked
 * (icons/<game>.sav, see build-icons.mjs). These are the other picture of that
 * same puzzle: the whole board, and solved — what the reader is being asked to
 * arrive at, which is what instructions want to show and what a crop of a
 * half-played grid cannot.
 *
 * The saved position itself is not reused. The game id is read back off the
 * engine — `midend_get_game_id`, as the menu shows it — and typed in again
 * through the app's own field, which deals that same puzzle afresh with no
 * moves on it. So the picture is of the id, and the id is proved to be the one
 * that names the puzzle rather than merely parsed out of the save. (It cannot
 * be parsed out: the save writes CPARAMS in full, and a game id spells its
 * parameters the short way.)
 *
 * Then Solve, where Solve fills in the answer. Six puzzles come out as the deal
 * instead, and the log says which:
 *
 *  - cube, samegame and pegs declare `can_solve` false upstream, so the sheet
 *    leaves the button out and there is nothing to ask.
 *  - flood, inertia and flip have solvers that hand you the answer to carry out
 *    rather than carrying it out. "This is a solve move, so we don't actually
 *    _change_ the grid but merely set up a stored solution path" (flood.c);
 *    inertia stores the same kind of route; flip sets `hints_active` and rings
 *    the squares to press. Asked and then followed to the end, those three
 *    finish as one flat colour, as a board with nothing left to collect, and as
 *    twenty-five identical squares — every one a worse picture of its puzzle
 *    than the deal. So they are left dealt, and deliberately unsolved.
 *
 * Run against a preview server, all forty or a few by name:
 *   npx vite preview --port 4173 &
 *   node scripts/build-solved.mjs
 *   node scripts/build-solved.mjs net solo mines
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(root, 'vendor/sgtpuzzles/icons')
const outDir = path.join(root, 'public/solved')
const BASE = process.env.PUZZLES_BASE ?? 'http://localhost:4173'

/*
 * Big enough that a twenty-square grid still has room for its numbers, small
 * enough that the file is an illustration rather than a wallpaper. Doubled by
 * the device scale factor, so the lines are drawn at the resolution a good
 * screen shows them at.
 */
const VIEWPORT = { width: 760, height: 900 }

/**
 * Puzzles whose Solve shows the answer rather than applying it — see the head
 * of this file. Asking is worse than not asking: it would draw a route or a ring
 * of hints over a board no nearer solved than the deal.
 */
const SOLVE_ONLY_SHOWS = new Set(['flood', 'inertia', 'flip'])

/** What is on the board right now, as something comparable. */
const board = (page) =>
  page.evaluate(() => document.querySelector('.host-board').toDataURL())

/** Ask, then let anything that animates its way to the answer land. */
async function solve(page) {
  await page.evaluate(() => window.__puzzle.solve())
  await page.waitForFunction(() => !window.__animating, null, { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(300)
}

const games = JSON.parse(fs.readFileSync(path.join(root, 'src/games.json'), 'utf8'))
const only = process.argv.slice(2)
const wanted = only.length ? games.filter((g) => only.includes(g.name)) : games

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM ??
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
fs.mkdirSync(outDir, { recursive: true })

const ids = {}
let failed = 0

for (const game of wanted) {
  const savePath = path.join(iconsDir, `${game.name}.sav`)
  if (!fs.existsSync(savePath)) {
    console.error(`  ${game.name.padEnd(10)} no saved position upstream`)
    failed++
    continue
  }

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    // Pinned, for the same reason as the thumbnails: a machine that happens to
    // prefer dark must not build the set upside down.
    colorScheme: 'light',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  try {
    /*
     * There is one address, so which puzzle to open is `puzzles.last` and
     * nothing else. Seed it, then come back through about:blank — a second
     * `goto` of the same address would not reload.
     */
    await page.goto(BASE, { waitUntil: 'load' })
    await page.evaluate((name) => {
      localStorage.clear()
      localStorage.setItem('puzzles.last', name)
    }, game.name)
    await page.goto('about:blank')
    await page.goto(BASE, { waitUntil: 'load' })
    await page.waitForFunction(
      () => document.querySelector('.play')?.dataset.ready === 'true',
      null,
      { timeout: 30000 },
    )

    // The position the cover was cropped from, so the id is that puzzle's.
    await page.evaluate((text) => window.__puzzle.loadGame(text), fs.readFileSync(savePath, 'utf8'))
    await page.waitForTimeout(400)

    // What the engine calls this puzzle, and whether it can finish it.
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.waitForSelector('.sheet-id input')
    const id = await page.locator('.sheet-id input').first().inputValue()
    const canSolve =
      !SOLVE_ONLY_SHOWS.has(game.name) &&
      (await page.getByRole('button', { name: 'Solve' }).count()) > 0
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    /*
     * Type it back in. The dialog is the same one the menu's field submits
     * through: the control it carries is live, so filling the box is what sets
     * the value the back end reads on OK.
     */
    await page.evaluate(() => window.__puzzle.enterGameId())
    await page.waitForSelector('.dialog-string input')
    await page.locator('.dialog-string input').first().fill(id)
    await page.getByRole('button', { name: 'OK' }).click()
    if (await page.locator('.dialog-string input').count())
      throw new Error(`the engine would not take back its own id: ${id}`)
    await page.waitForTimeout(500)

    /*
     * Solve, and check it took. Two puzzles keep the answer in the `aux` their
     * deal was generated with — netslide and untangle refuse outright without
     * it — and a typed id carries no aux, so nothing happens and the picture
     * would quietly be of an unsolved board. The save does carry it (AUXINFO),
     * so deal it from there instead and ask again.
     *
     * Told by the board rather than by the error, which is the same question
     * asked of the thing being photographed: a solve that changes no pixel
     * solved nothing.
     */
    let route = ''
    if (canSolve) {
      const before = await board(page)
      await solve(page)
      if ((await board(page)) === before) {
        route = ' (dealt from the save, for its aux)'
        await page.evaluate((text) => {
          window.__puzzle.loadGame(text)
          window.__puzzle.restart()
        }, fs.readFileSync(savePath, 'utf8'))
        await page.waitForTimeout(400)
        const second = await board(page)
        await solve(page)
        if ((await board(page)) === second) {
          const said = await page.locator('.play-error').textContent().catch(() => null)
          throw new Error(`solve changed nothing${said ? `: ${said}` : ''}`)
        }
      }
    }

    const shot = await page.locator('.host-board').screenshot()
    fs.writeFileSync(path.join(outDir, `${game.name}.png`), shot)
    ids[game.name] = id

    const size = await page.evaluate(() => {
      const c = document.querySelector('.host-board')
      return `${c.width}x${c.height}`
    })
    const how = canSolve
      ? 'solved  '
      : SOLVE_ONLY_SHOWS.has(game.name)
        ? 'as dealt (shown only)'
        : 'as dealt (no solver)'
    console.log(`  ${game.name.padEnd(10)} ${size.padEnd(9)} ${how.padEnd(20)} ${id}${route}`)
    if (errors.length) throw new Error(errors[0])
  } catch (error) {
    console.error(`  ${game.name.padEnd(10)} FAILED: ${error.message}`)
    failed++
  }
  await context.close()
}

await browser.close()

/*
 * The ids beside the pictures they are of. A caption wants them, and a rebuild
 * of one puzzle should not have to be told what it is a picture of.
 */
if (Object.keys(ids).length) {
  const file = path.join(outDir, 'ids.json')
  const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const merged = Object.fromEntries(
    games.map((g) => [g.name, ids[g.name] ?? kept[g.name]]).filter(([, v]) => v),
  )
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`)
}

console.log(`\nwrote ${Object.keys(ids).length} boards to public/solved`)
if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
