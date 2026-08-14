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

const at = () =>
  page.evaluate(() => {
    const m = /STATEPOS\s*:\d+:(\d+)/.exec(window.__puzzle.saveGame())
    return m ? Number(m[1]) : NaN
  })

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
