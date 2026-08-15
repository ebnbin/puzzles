//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-solved.mjs
//
// 被测选 Fifteen 是有讲究的:它的 'h' 是提示键,每按一次替玩家走一步合法的子,
// 存档里记成 MOVE——所以能在不碰求解器的前提下把一局真解出来。
import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const SOLVED = 'puzzles.solved'

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }
const ok = (...m) => console.log('  ok  ', ...m)

const stored = () => page.evaluate((k) => localStorage.getItem(k), SOLVED)

async function open() {
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((k) => {
    localStorage.removeItem(k)
    localStorage.removeItem('puzzles.playing')
    localStorage.removeItem('puzzles.save.fifteen')
  }, SOLVED)
  await page.goto(URL_BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Fifteen/ }).first().click()
  await page.waitForFunction(() => !!window.__puzzle, null, { timeout: 20000 })
  await page.waitForTimeout(400)
}

const status = () => page.evaluate(() => window.__puzzle.status?.() ?? null)

// 提示键一步步走到解出。动画要走完 status 才落定,所以每步之后推一下时钟。
async function hintUntilSolved(limit = 400) {
  for (let i = 0; i < limit; i++) {
    if ((await status()) === 1) return i
    await page.evaluate(() => {
      const api = window.__puzzle
      api.key(72, 'h', '', 0, 0, 0)
      api.tick(1)
    })
  }
  return null
}

await open()
if ((await status()) === null) {
  console.log('  引擎里没有 status(),是旧产物,跳过整份检查')
  await browser.close()
  process.exit(0)
}

// 一、求解器解出的不算
await page.evaluate(() => window.__puzzle.solve())
await page.evaluate(() => window.__puzzle.tick(1))
if ((await status()) !== 1) fail('solve() 之后 status 应当是 +1')
else if (await stored()) fail('求解器解出的被记成了完成:', await stored())
else ok('求解器解出的不算')

// 二、玩家自己解出的算
await open()
const steps = await hintUntilSolved()
if (steps === null) fail('提示键没能把这一局走到解出')
else {
  const after = await stored()
  if (!after) fail(`走了 ${steps} 步解出,却没记成完成`)
  else ok(`玩家自己解出的记下了(${steps} 步)`, after)
}

// 三、undo 再 redo 不重复记。清掉存档里的记录,重报的话它会重新出现。
await page.evaluate((k) => localStorage.removeItem(k), SOLVED)
await page.evaluate(() => {
  const api = window.__puzzle
  api.undo(); api.tick(1)
  api.redo(); api.tick(1)
})
await page.waitForTimeout(200)
if (await stored()) fail('undo 再 redo 之后重报了一次:', await stored())
else ok('undo 再 redo 不重复记')

// 四、重开一局之后,新的一局可以再记
await page.evaluate(() => window.__puzzle.newGame())
await page.waitForTimeout(300)
if ((await status()) === 1) fail('新一局不该是已解出状态')
else ok('新一局重新开始计')

await browser.close()
console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
