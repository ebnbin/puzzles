import { boot, open } from './lib/boot.mjs'

const STEPS = Number(process.env.STEPS ?? 40)

const { browser, page } = await boot({ touch: true })
await open(page, 'Palisade', { settle: 900 })

const at = () =>
  page.evaluate(() => {
    // 「已应用步数」要读 STATEPOS、不能数 MOVE 行:序列化带完整链、含被 undo 的
    // 走子,新走子顶替 redo 尾巴时行数不变——数行会让检查与坏的实现互相同意。
    const m = /STATEPOS\s*:\d+:(\d+)/.exec(window.__puzzle.saveGame())
    return m ? Number(m[1]) : NaN
  })

// palisade 的「画边」「画叉」钉在 4、6 号格(编号见 src/games/palisade.ts),文档序即
// 格子序,所以 nth(0)/nth(1) 就是这两个。
const ACTS = ".play-arrows [data-slot='4'], .play-arrows [data-slot='6']"
const WAY = { left: 1, down: 2, right: 3, up: 5 }

const claims = () =>
  page.evaluate((sel) =>
    [...document.querySelectorAll(sel)].map((b) => ({
      dim: b.disabled,
      down: b.hasAttribute('data-on'),
    })),
  ACTS)

const press = (i) => page.locator(ACTS).nth(i).click({ force: true })
const arrow = (d) => page.locator(`.play-arrows [data-slot='${WAY[d]}']`).click()
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
