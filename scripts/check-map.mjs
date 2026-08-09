/*
 * Does Map's palette paint the region the cursor is standing on?
 *
 * src/engine/map.ts does not model map.c's geometry — it asks the engine, for
 * the reason written at the top of that file. So this is not check-cube.mjs's
 * kind of test, where a model is compared with the thing it copies. There is no
 * model. What can still go wrong is the asking: the walk that carries the probe
 * colour, the cursor copy the walk is aimed by, the clue list, or the move
 * language. Any of those and a press paints the wrong region, or none.
 *
 * So this drives the real buttons and checks the board afterwards, from the
 * outside: press a swatch, then ask the engine — by the same double-press
 * upstream answers to — which region the cursor is on now, and compare with the
 * region the save says was painted. Two independent readings of one press.
 *
 * Worth running after upgrading vendor/sgtpuzzles, and after touching
 * engine/map, PuzzleHost's cursor copy, or Map's entry in engine/keys.
 *
 * Needs a preview server and playwright, like the other scripts outside
 * package.json:
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/check-map.mjs
 */
import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const ROUNDS = Number(process.env.ROUNDS ?? 12)

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
await page.goto(URL_BASE)
await page.evaluate(() => {
  localStorage.setItem('puzzles.arrows', '["map"]')
  localStorage.removeItem('puzzles.playing')
})
await page.goto(URL_BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Map/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(900)

const moves = () => page.evaluate(() =>
  window.__puzzle.saveGame().split('\n').filter((l) => l.startsWith('MOVE')))
const arrow = async (d) => {
  await page.locator(`.play-arrows button[aria-label="${d}"]`).click()
  await page.waitForTimeout(60)
}

/*
 * Which region the cursor is on, asked the way engine/map asks but without any
 * of engine/map: pick up whatever is there and put it straight back down, which
 * is upstream's own "empty this region" (map.c:2532), then undo. It names the
 * region whenever there is something to empty — which, right after a swatch has
 * been pressed, there always is.
 */
const whereIsTheCursor = async () => {
  const before = await moves()
  await page.evaluate(() => {
    window.__puzzle.key(0, 'Enter', '', 0, 0, 0)
    window.__puzzle.key(0, 'Enter', '', 0, 0, 0)
  })
  await page.waitForTimeout(80)
  const after = await moves()
  if (after.length <= before.length) return null
  const m = /MOVE\s*:\d+:(?:\d|C):(\d+)/.exec(after[after.length - 1])
  await page.evaluate(() => window.__puzzle.undo())
  await page.waitForTimeout(60)
  return m ? Number(m[1]) : null
}

let checked = 0
let wrong = 0
// A pseudo-random walk with a fixed seed, so a failure can be reproduced.
let seed = 20250809
const next = (n) => {
  seed ^= seed << 13; seed |= 0
  seed ^= seed >>> 17
  seed ^= seed << 5; seed |= 0
  return Math.abs(seed) % n
}

for (let round = 0; round < ROUNDS; round++) {
  // Somewhere the reader might plausibly have walked to.
  for (let i = 0; i < 3 + next(9); i++) await arrow(['Right', 'Down', 'Left', 'Up'][next(4)])
  /*
   * Then a colour the region has not already got. A press that plays nothing is
   * right — a region already that colour, or a clue — but it checks nothing, and
   * a first colour picked blind comes up empty often enough to leave the run
   * with two or three cases in it. Four tries settles it: only a clue refuses
   * all four.
   */
  let colour = next(4) + 1
  let before = await moves()
  let after = before
  for (let tries = 0; tries < 4 && after.length === before.length; tries++) {
    colour = (colour % 4) + 1
    await page.getByRole('button', { name: new RegExp(`^Fill this region with colour ${colour}$`) }).click()
    await page.waitForTimeout(250)
    after = await moves()
  }
  if (after.length === before.length) continue      // a clue

  const played = /MOVE\s*:\d+:(\d|C):(\d+)/.exec(after[after.length - 1])
  const paintedRegion = played ? Number(played[2]) : null
  const paintedColour = played ? played[1] : null
  const standing = await whereIsTheCursor()
  checked++

  if (paintedRegion === null || standing === null || paintedRegion !== standing) {
    wrong++
    console.error(
      `round ${round}: the key painted region ${paintedRegion}, ` +
      `but the cursor is standing on region ${standing}`,
    )
  }
  if (paintedColour !== String(colour - 1)) {
    wrong++
    console.error(`round ${round}: colour ${colour} wrote "${paintedColour}", wanted "${colour - 1}"`)
  }
}

/*
 * And the refusals, which need a case each because a silent bug and a silent
 * refusal look the same from outside. Filled first, so that the region is known
 * to have something in it and each press has a definite right answer.
 */
const count = async (what, want, act) => {
  const before = (await moves()).length
  await act()
  await page.waitForTimeout(250)
  const played = (await moves()).length - before
  if (played !== want) {
    wrong++
    console.error(`${what}: played ${played} moves, wanted ${want}`)
  }
}
const swatch = (re) => () => page.getByRole('button', { name: re }).click()
const FILL_1 = /^Fill this region with colour 1$/
const MAYBE_2 = /^Mark this region as possibly colour 2$/
const EMPTY = /^Empty this region$/
/*
 * First find a region the cases can be run on. The random walk leaves the cursor
 * wherever it leaves it, and a clue refuses everything — correctly — so asserting
 * from there would be asserting about the wrong thing. Walk until a fill plays,
 * then empty it, and the state is known.
 */
let ready = false
for (let i = 0; i < 40 && !ready; i++) {
  const before = (await moves()).length
  await swatch(FILL_1)()
  await page.waitForTimeout(200)
  if ((await moves()).length > before) ready = true
  // Rightwards, dropping a row now and then: a cycle of four directions
  // would come back to where it started and search one region forty times.
  else await arrow(i % 5 === 4 ? 'Down' : 'Right')
}
if (!ready) {
  wrong++
  console.error('could not find a region the palette would paint at all')
}
await swatch(EMPTY)()
await page.waitForTimeout(250)
await count('emptying an already empty region', 0, swatch(EMPTY))
await count('filling an empty region', 1, swatch(FILL_1))
await count('filling it with the same colour again', 0, swatch(FILL_1))
await count('stippling a coloured region (upstream refuses)', 0, swatch(MAYBE_2))
await count('emptying it', 1, swatch(EMPTY))
await count('stippling the empty region', 1, swatch(MAYBE_2))
await count('the same stipple again, which turns it back off', 1, swatch(MAYBE_2))

await browser.close()
console.log(`${checked} presses checked against the engine, ${wrong} wrong`)
process.exit(wrong ? 1 : 0)
