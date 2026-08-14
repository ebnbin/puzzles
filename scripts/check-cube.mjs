/**
 * Does the app grey exactly the arrows Cube's back end refuses?
 *
 * Not in `npm run build`, for the same reason the marks checks and the three
 * picture scripts are not: it needs a browser and a running engine, and
 * playwright is not in package.json. It is here because src/engine/cube.ts is
 * the one module whose correctness is "our geometry matches upstream's", which
 * no type can state and no unit test can settle — the only authority is the C,
 * running.
 *
 * Run it after any bump of vendor/sgtpuzzles and after any change to
 * engine/cube. A model that has drifted greys an arrow that works, and that is
 * the one failure a reader cannot report: a wrongly greyed button looks exactly
 * like an honestly greyed one.
 *
 *   npm run build
 *   npx vite preview --port 4173 &
 *   node scripts/check-cube.mjs
 *
 * Three things are kept apart on purpose:
 *
 *   - The *claim* is read from the DOM — the four arrows' `disabled` attribute.
 *     Not from the module, so this covers the whole path including the wiring,
 *     and not from the labels, which say the same thing whether or not a button
 *     can be pressed.
 *   - The *truth* is taken from the engine: save, send the arrow, save again. A
 *     save that did not change is a move the back end refused, and both of its
 *     refusals — the square's shape and the edge of the grid — end in
 *     MOVE_NO_EFFECT, which never reaches the move list. A save that did change
 *     is undone with loadGame, which round-trips byte for byte.
 *   - The *walk* uses a second, independent copy of upstream's enumeration,
 *     below, and only ever to decide where to step next and whether it has been
 *     there. It is never the expected answer. Written from cube.c rather than
 *     from engine/cube, so a mistake shared by both is a mistake made twice.
 */
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL ?? 'http://localhost:4173/'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const LABELS = ['Left', 'Right', 'Up', 'Down']
const OPPOSITE = [1, 0, 3, 2]

/* --- the navigation model, from cube.c:325-467 and 1054 ------------------- */

function squares(solid, d1, d2) {
  const out = []
  if (solid === 'c') {
    for (let y = 0; y < d2; y++)
      for (let x = 0; x < d1; x++)
        out.push({
          pts: [[2 * x - 1, 2 * y - 1], [2 * x - 1, 2 * y + 1],
                [2 * x + 1, 2 * y + 1], [2 * x + 1, 2 * y - 1]],
          dirs: [[0, 1], [2, 3], [0, 3], [1, 2]],
        })
    return out
  }
  for (let row = 0; row < d1 + d2; row++) {
    const other = row < d2 ? 1 : -1
    const rowlen = row < d2 ? row + d1 : 2 * d2 + d1 - row
    for (let i = 0; i < rowlen; i++) {
      const ix = 2 * i - (rowlen - 1)
      out.push({ pts: [[ix - 1, row], [ix, row + 1], [ix + 1, row]],
                 dirs: [[0, 1], [1, 2], [0, 2], null] })
    }
    for (let i = 0; i < rowlen + other; i++) {
      const ix = 2 * i - (rowlen + other - 1)
      out.push({ pts: [[ix + 1, row + 1], [ix, row], [ix - 1, row + 1]],
                 dirs: [[1, 2], [0, 1], null, [0, 2]] })
    }
  }
  return out
}

function neighbour(sqs, from, dir) {
  const pair = sqs[from].dirs[dir]
  if (!pair) return -1
  const want = pair.map((k) => sqs[from].pts[k].join(','))
  for (let i = 0; i < sqs.length; i++) {
    if (i === from) continue
    const have = sqs[i].pts.map((p) => p.join(','))
    if (want.every((w) => have.includes(w))) return i
  }
  return -1
}

/* --- the check ------------------------------------------------------------ */

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 420, height: 900 } })
await page.goto(URL)
// The arrows are a per-puzzle preference and off by default; this is the block
// under test, so it has to be on.
await page.evaluate(() => localStorage.setItem('puzzles.arrows', 'true'))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Cube/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(700)

const save = () => page.evaluate(() => window.__puzzle.saveGame())
const load = (s) => page.evaluate((v) => window.__puzzle.loadGame(v), s)
const send = (k) => page.evaluate((key) => window.__puzzle.key(0, key, '', 0, 0, 0), k)
const field = (s, k) => s.split('\n').find((l) => l.startsWith(k))?.split(':').slice(2).join(':')

/** What the reader is being told, straight off the buttons. */
const claimed = async () => {
  await page.waitForTimeout(60)                 // let React paint the change
  const out = []
  for (const label of LABELS)
    out.push(!(await page.locator(`.play-arrows button[aria-label="${label}"]`).isDisabled()))
  return out
}

let checked = 0
let bad = 0

for (const preset of [0, 1, 2, 3]) {
  await page.evaluate((i) => window.__puzzle.selectPreset(i), preset)
  await page.waitForTimeout(600)
  const s0 = await save()
  const params = field(s0, 'CPARAMS')
  const m = /^([tcoi])(\d+)x(\d+)$/.exec(params)
  if (!m) { console.log(`FAIL ${params}: unreadable parameters`); bad++; continue }
  const sqs = squares(m[1], Number(m[2]), Number(m[3]))
  const start = Number(field(s0, 'DESC').split(',')[1])

  const seen = new Set()
  const trail = []
  let at = start
  let wrong = 0
  for (let guard = 0; guard < 8000; guard++) {
    if (!seen.has(at)) {
      seen.add(at)
      checked++
      const truth = []
      for (const arrow of ARROWS) {
        const before = await save()
        await send(arrow)
        const after = await save()
        truth.push(after !== before)
        if (after !== before) await load(before)
      }
      const said = await claimed()
      if (truth.join() !== said.join()) {
        wrong++
        bad++
        console.log(`  MISMATCH ${params} square ${at}\n` +
          `    engine: ${LABELS.filter((_, i) => truth[i]).join(' ') || '(none)'}\n` +
          `    shown : ${LABELS.filter((_, i) => said[i]).join(' ') || '(none)'}`)
      }
    }
    const next = [0, 1, 2, 3].find((d) => {
      const n = neighbour(sqs, at, d)
      return n >= 0 && !seen.has(n)
    })
    if (next !== undefined) {
      await send(ARROWS[next])
      trail.push(OPPOSITE[next])
      at = neighbour(sqs, at, next)
      continue
    }
    const home = trail.pop()
    if (home === undefined) break
    await send(ARROWS[home])
    at = neighbour(sqs, at, home)
  }

  const whole = seen.size === sqs.length
  if (!whole) bad++
  console.log(`${wrong || !whole ? 'FAIL' : 'ok  '} ${String(params).padEnd(6)} ` +
    `${String(seen.size).padStart(3)}/${sqs.length} squares, ${wrong} mismatches` +
    `${whole ? '' : '  — the walk did not reach every square'}`)
}

console.log(`\n${checked} squares checked, ${bad} problems`)
await browser.close()
process.exit(bad ? 1 : 0)
