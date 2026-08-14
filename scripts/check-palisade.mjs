/*
 * Do Palisade's two buttons say what the engine will actually do?
 *
 * They have nothing to go on but the drawing. That back end reports no key
 * labels at all, so src/engine/palisade.ts reads the frame each press draws:
 * the cursor outline's shape says whether the stop is a border or one of the
 * dead ones, and the colour of the border rect under it says what is already
 * there. Both readings are cheap and both are guesses about someone else's
 * drawing code, which is exactly the kind of thing that rots quietly on an
 * upstream bump — a wrongly greyed button looks the same as a rightly greyed
 * one.
 *
 * So this compares the reading with the engine, from the outside. At every stop
 * on a walk it takes what the row claims — dim or live, held down or not — and
 * then presses and counts the moves the press actually wrote:
 *
 *   dim         → the press must write nothing
 *   live, up    → one move (there was nothing there, or the other mark was, in
 *                 which case two: clear then lay)
 *   live, down  → one move, and it must take this key's own mark off
 *
 * Every press is undone afterwards, so the walk does not depend on the board it
 * has been building.
 *
 * Worth running after upgrading vendor/sgtpuzzles, and after touching
 * engine/palisade, the recording in engine/renderer, or Palisade's entry in
 * engine/keys.
 *
 * Needs a preview server and playwright, like the other scripts outside
 * package.json:
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/check-palisade.mjs
 */
import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const STEPS = Number(process.env.STEPS ?? 40)

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
await page.goto(URL_BASE)
await page.evaluate(() => {
  localStorage.setItem('puzzles.arrows', 'true')
  localStorage.removeItem('puzzles.playing')
})
await page.goto(URL_BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Palisade/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(900)

/*
 * How many moves have been *applied*, which is not how many the save lists: a
 * serialised game carries its whole chain including anything undone, so
 * counting MOVE lines says a press wrote nothing when it wrote over a redo.
 * STATEPOS is the position in that chain and is what a press moves.
 */
const at = () =>
  page.evaluate(() => {
    const m = /STATEPOS\s*:\d+:(\d+)/.exec(window.__puzzle.saveGame())
    return m ? Number(m[1]) : NaN
  })

/** What the row is claiming right now, per key. */
const claims = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.play-arrows [data-act]')].map((b) => ({
      dim: b.disabled,
      down: b.hasAttribute('data-on'),
    })),
  )

const press = (i) => page.locator('.play-arrows [data-act]').nth(i).click({ force: true })
const arrow = (d) => page.locator(`.play-arrows [data-dir=${d}]`).click()
const undo = (n) => page.evaluate((k) => { for (let i = 0; i < k; i++) window.__puzzle.undo() }, n)

// The walk: a lap that visits both kinds of border and both kinds of dead stop.
const WALK = ['right', 'down', 'left', 'down', 'right', 'right', 'up', 'left']

let checked = 0
let bad = 0
const say = (what) => {
  bad++
  console.log(`  ✗ ${what}`)
}

await arrow('right')
await page.waitForTimeout(250)

for (let step = 0; step < STEPS; step++) {
  await arrow(WALK[step % WALK.length])
  await page.waitForTimeout(160)

  for (const key of [0, 1]) {
    const before = await claims()
    const n0 = await at()
    await press(key)
    await page.waitForTimeout(200)
    const wrote = (await at()) - n0
    checked++

    if (before[key].dim && wrote !== 0)
      say(`step ${step} key ${key}: greyed, but the press wrote ${wrote}`)
    if (!before[key].dim && wrote === 0)
      say(`step ${step} key ${key}: live, but the press wrote nothing`)
    if (before[key].down && wrote > 1)
      say(`step ${step} key ${key}: held down, so one move was due; wrote ${wrote}`)

    if (wrote > 0) {
      await undo(wrote)
      await page.waitForTimeout(160)
      const after = await claims()
      if (after[key].down !== before[key].down)
        say(`step ${step} key ${key}: undone, but the button did not come back`)
    }
  }
}

console.log(`${checked} presses checked, ${bad} disagreed`)
await browser.close()
process.exit(bad ? 1 : 0)
