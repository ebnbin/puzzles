/*
 * Do Tents' two switches land the value they promise, from every state?
 *
 * src/engine/tents.ts decides what a press should do by reading the save file:
 * it sends the key, finds the square in the move the engine wrote, and walks
 * the earlier moves backwards to see what was there. Nothing about that is
 * checked by the compiler and nothing about it shows on screen when it is
 * wrong — a misread square makes a button set what it should have cleared,
 * which looks exactly like a button that was pressed once too often.
 *
 * So this presses the real buttons through all six cases (three states, two
 * buttons) and reads the board back a different way: rebuilt from DESC and the
 * save's own move list, which is the same source engine/tents reads but the
 * whole board rather than one square, and written here rather than imported.
 * It also checks the history grows by exactly one step per press — the switch
 * undoes its own no-op, and if that stopped working the board would still be
 * right while Undo quietly ate a press.
 *
 * Two paths get their own rounds because they are the two the walk can get
 * wrong: Solve, whose move greens the whole board in one step (`S`), and
 * Restart, which sends the board back to the deal.
 *
 * Worth running after upgrading vendor/sgtpuzzles, and after touching
 * engine/tents or Tents' entry in engine/keys.
 *
 * Needs a preview server and playwright, like the other scripts outside
 * package.json:
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/check-tents.mjs
 */
import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const DEALS = Number(process.env.DEALS ?? 3)

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
await page.goto(URL_BASE)
await page.evaluate(() => {
  localStorage.setItem('puzzles.arrows', '["tents"]')
  localStorage.removeItem('puzzles.playing')
})
await page.goto(URL_BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Tents/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(900)

/*
 * The board, rebuilt from the save: the description gives the trees
 * (tents.c:1270) and the moves give everything else (tents.c:1730). Deliberately
 * a whole grid played forwards, where engine/tents walks one square backwards —
 * two ways of reading the same file, so a mistake in one is not a mistake in
 * both.
 */
const board = () => page.evaluate(() => {
  const save = window.__puzzle.saveGame()
  const lines = []
  for (let at = 0; at < save.length;) {
    const key = save.slice(at, at + 8).trimEnd()
    const colon = save.indexOf(':', at + 9)
    const length = Number(save.slice(at + 9, colon))
    lines.push({ key, value: save.slice(colon + 1, colon + 1 + length) })
    at = colon + 1 + length + 1
  }
  const field = (k) => lines.find((f) => f.key === k)?.value
  const [w, h] = field('PARAMS').match(/^(\d+)x(\d+)/).slice(1).map(Number)
  const grid = new Array(w * h).fill('.')
  let i = 0
  for (const c of field('DESC')) {
    if (c === ',') break
    if (c === 'z') { i += 25; continue }
    if (c === '_') { grid[i++] = '#'; continue }
    if (c < 'a' || c > 'y') throw new Error(`unreadable description: ${c}`)
    i += c.charCodeAt(0) - 96
    if (i === w * h) break
    grid[i++] = '#'
  }
  const played = lines.filter((f) => ['MOVE', 'SOLVE', 'RESTART'].includes(f.key))
    .slice(0, Number(field('STATEPOS')) - 1)
  for (const move of played) {
    if (move.key === 'RESTART') {
      for (let j = 0; j < grid.length; j++) if (grid[j] !== '#') grid[j] = '.'
      continue
    }
    for (const step of move.value.split(';')) {
      if (step === 'S') {
        for (let j = 0; j < grid.length; j++) if (grid[j] !== '#') grid[j] = 'v'
        continue
      }
      const m = step.match(/^([TNB])(\d+),(\d+)$/)
      if (!m) throw new Error(`unreadable move: ${step}`)
      grid[+m[3] * w + +m[2]] = m[1] === 'T' ? 'A' : m[1] === 'N' ? 'v' : '.'
    }
  }
  return { w, h, grid, steps: Number(field('STATEPOS')) - 1 }
})

const press = async (which) => {
  await page.locator(`.play-arrows button[data-act="${which}"]`).click()
  await page.waitForTimeout(90)
}
const arrow = async (d) => {
  await page.locator(`.play-arrows button[aria-label="${d}"]`).click()
  await page.waitForTimeout(60)
}
const deal = async () => {
  await page.getByRole('button', { name: /^Menu$/ }).click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /^New game$/ }).click()
  await page.waitForTimeout(900)
}

/* Drive the cursor to a known square: clamped by move_cursor, so a wall of
   presses in one direction lands on the edge whatever it started from. */
const goTo = async (x, y, { w, h }) => {
  for (let i = 0; i < h; i++) await arrow('Up')
  for (let i = 0; i < w; i++) await arrow('Left')
  for (let i = 0; i < x; i++) await arrow('Right')
  for (let i = 0; i < y; i++) await arrow('Down')
}

/* The truth table: from each starting state, what each button must leave. */
const WANT = {
  '.': { first: 'A', second: 'v' },
  A: { first: '.', second: 'v' },
  v: { first: 'A', second: '.' },
}
const NAME = { '.': '空', A: '帐篷', v: '草' }
const BUTTON = { first: '帐篷键', second: '草键' }

let bad = 0
let tried = 0

const check = async (x, y, want, what) => {
  const size = await board()
  const was = size.grid[y * size.w + x]
  await press(want)
  const now = await board()
  const got = now.grid[y * size.w + x]
  const should = WANT[was][want]
  const grew = now.steps - size.steps
  tried++
  const wrong = got !== should || grew !== 1
  if (wrong) bad++
  console.log(
    `  ${(what + ' ' + BUTTON[want]).padEnd(22)}` +
    `${NAME[was]} → ${NAME[got]}` +
    `${got === should ? '' : `  ✗ 应该是 ${NAME[should]}`}` +
    `   历史 +${grew}${grew === 1 ? '' : '  ✗ 应该 +1'}`,
  )
  return now
}

for (let round = 0; round < DEALS; round++) {
  if (round) await deal()
  const size = await board()
  // A square with no tree on it, and not on the edge, so both neighbours exist.
  let x = 0, y = 0
  outer: for (let j = 0; j < size.h; j++)
    for (let i = 0; i < size.w; i++)
      if (size.grid[j * size.w + i] !== '#') { x = i; y = j; break outer }
  await arrow('Right')
  await goTo(x, y, size)
  console.log(`第 ${round + 1} 局，${size.w}×${size.h}，用 (${x},${y})：`)

  // Six cases. Each `check` leaves the square in a known state for the next.
  await check(x, y, 'first', '空上按')     // . -> A
  await check(x, y, 'first', '帐篷上按')   // A -> .
  await check(x, y, 'second', '空上按')    // . -> v
  await check(x, y, 'second', '草上按')    // v -> .
  await check(x, y, 'first', '空上按')     // . -> A
  await check(x, y, 'second', '帐篷上按')  // A -> v   ← 直接覆盖
  await check(x, y, 'first', '草上按')     // v -> A   ← 直接覆盖

  // Undo has to be one press per press, including the ones that took
  // themselves back.
  const before = await board()
  await page.getByRole('button', { name: /^Undo$/ }).click()
  await page.waitForTimeout(140)
  const after = await board()
  const stepped = before.steps - after.steps
  console.log(`  撤销一次        历史 ${before.steps} → ${after.steps}` +
    `${stepped === 1 ? '' : '  ✗ 应该退一步'}`)
  if (stepped !== 1) bad++
  tried++

  // The solver's move greens the whole board in one step; the walk has to see
  // it. Pressing the green button on a green square must empty it.
  await page.getByRole('button', { name: /^Menu$/ }).click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /^Solve$/ }).click()
  await page.waitForTimeout(900)
  await goTo(x, y, size)
  const solved = await board()
  console.log(`  求解之后 (${x},${y}) 是 ${NAME[solved.grid[y * solved.w + x]]}`)
  await check(x, y, 'second', '求解后')
  await check(x, y, 'first', '求解后')

  // And a restart puts the board back to the deal, which is empty everywhere.
  await page.getByRole('button', { name: /^Menu$/ }).click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /^Restart$/ }).click()
  await page.waitForTimeout(900)
  await goTo(x, y, size)
  await check(x, y, 'first', '重开后')
  await check(x, y, 'first', '重开后')
}

console.log(`\n${tried} 次，错 ${bad} 次`)
await browser.close()
process.exit(bad ? 1 : 0)
