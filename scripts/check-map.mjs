import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const ROUNDS = Number(process.env.ROUNDS ?? 12)

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
await page.getByRole('button', { name: /^Map/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(900)

const moves = () => page.evaluate(() =>
  window.__puzzle.saveGame().split('\n').filter((l) => l.startsWith('MOVE')))
const arrow = async (d) => {
  await page.locator(`.play-arrows button[aria-label="${d}"]`).click()
  await page.waitForTimeout(60)
}

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

await arrow('Right')

let checked = 0
let wrong = 0
let seed = 20250809
const next = (n) => {
  seed ^= seed << 13; seed |= 0
  seed ^= seed >>> 17
  seed ^= seed << 5; seed |= 0
  return Math.abs(seed) % n
}

for (let round = 0; round < ROUNDS; round++) {
  for (let i = 0; i < 3 + next(9); i++) await arrow(['Right', 'Down', 'Left', 'Up'][next(4)])
  if (await page.getByRole('button', { name: /^Fill this region with colour 1$/ }).isDisabled())
    continue
  let colour = next(4) + 1
  let before = await moves()
  let after = before
  for (let tries = 0; tries < 4 && after.length === before.length; tries++) {
    colour = (colour % 4) + 1
    await page.getByRole('button', { name: new RegExp(`^Fill this region with colour ${colour}$`) }).click()
    await page.waitForTimeout(250)
    after = await moves()
  }
  if (after.length === before.length) continue

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
const EMPTY = /^Empty this region$/
const MAYBE = /^Next colour: mark it as a maybe$/
const MAYBE_2 = () => async () => {
  await page.getByRole('button', { name: MAYBE }).click()
  await page.getByRole('button', { name: /^Mark this region as possibly colour 2$/ }).click()
  await page.getByRole('button', { name: MAYBE }).click()
  await page.waitForTimeout(120)
}
let ready = false
for (let i = 0; i < 40 && !ready; i++) {
  if (await page.getByRole('button', { name: FILL_1 }).isDisabled()) {
    await arrow(i % 5 === 4 ? 'Down' : 'Right')
    continue
  }
  const before = (await moves()).length
  await swatch(FILL_1)()
  await page.waitForTimeout(200)
  if ((await moves()).length > before) ready = true
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
await count('stippling a coloured region (upstream refuses)', 0, MAYBE_2())
await count('emptying it', 1, swatch(EMPTY))
await count('stippling the empty region', 1, MAYBE_2())
await count('the same stipple again, which turns it back off', 1, MAYBE_2())

await browser.close()
console.log(`${checked} presses checked against the engine, ${wrong} wrong`)
process.exit(wrong ? 1 : 0)
