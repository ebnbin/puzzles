import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL ?? 'http://localhost:4173/'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const LABELS = ['Left', 'Right', 'Up', 'Down']
const OPPOSITE = [1, 0, 3, 2]

// 这份走位模型是照 cube.c:325-467 独立重写的第二份,只用于决定往哪走、绝不作为
// 期望值;不能改成 import src/games/cube.ts——与被测代码共享实现,共同的错误
// 就互相印证了,检查从此永远通过、什么也不测。
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

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 420, height: 900 } })
await page.goto(URL)
await page.evaluate(() => localStorage.setItem('puzzles.arrows', 'true'))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Cube/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(700)

const save = () => page.evaluate(() => window.__puzzle.saveGame())
const load = (s) => page.evaluate((v) => window.__puzzle.loadGame(v), s)
const send = (k) => page.evaluate((key) => window.__puzzle.key(0, key, '', 0, 0, 0), k)
const field = (s, k) => s.split('\n').find((l) => l.startsWith(k))?.split(':').slice(2).join(':')

const claimed = async () => {
  await page.waitForTimeout(60)
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
