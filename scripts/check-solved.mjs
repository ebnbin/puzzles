//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-solved.mjs
//
// 被测选 Fifteen 是有讲究的:它的 'h' 是提示键,每按一次替玩家走一步合法的子,
// 存档里记成 MOVE——所以能在不碰求解器的前提下把一局真解出来。
import { boot, open } from './lib/boot.mjs'

const SOLVED = 'puzzles.solved'

const { browser, page } = await boot()

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }
const ok = (...m) => console.log('  ok  ', ...m)

const stored = () => page.evaluate((k) => localStorage.getItem(k), SOLVED)

// arrows 关着进门:下面按文档序数 role=group 里的按钮,方向键块会多出一个 group。
const reopen = () =>
  open(page, 'Fifteen', { arrows: false, clear: [SOLVED, 'puzzles.save.fifteen'] })

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

await reopen()
if ((await status()) === null) {
  console.log('  引擎里没有 status(),是旧产物,跳过整份检查')
  await browser.close()
  process.exit(0)
}

// 一、求解器解出的不记,但浮层照抬——浮层认「结束」,不认「谁解的」。
// 开局第一个动作就是求解,考的是启动时那次基线补得对不对。
await page.evaluate(() => window.__puzzle.solve())
await page.evaluate(() => window.__puzzle.tick(1))
await page.waitForTimeout(300)
if ((await status()) !== 1) fail('solve() 之后 status 应当是 +1')
else if (await stored()) fail('求解器解出的被记成了完成:', await stored())
else ok('求解器解出的不记')
if (!(await page.locator('.puzzle-over').isVisible()))
  fail('开局直接求解,浮层没抬起来')
else ok('求解器结束的一局也抬浮层')

// 二、玩家自己解出的算
await reopen()
const steps = await hintUntilSolved()
if (steps === null) fail('提示键没能把这一局走到解出')
else {
  const after = await stored()
  if (!after) fail(`走了 ${steps} 步解出,却没记成完成`)
  else ok(`玩家自己解出的记下了(${steps} 步)`, after)
}

// 三、收尾浮层:结束时抬起来,关掉之后不再自己冒出来,回到进行中再重新武装
const over = page.locator('.puzzle-over')
if (!(await over.isVisible())) fail('解出之后没有抬出收尾浮层')
else ok('结束时抬出收尾浮层')

if (process.env.SHOT) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: process.env.SHOT })
}

await page.getByRole('group').getByRole('button').nth(1).click()
await page.waitForTimeout(200)
if (await over.isVisible()) fail('按了关闭,浮层还在')
else ok('关掉就收起来')

await page.evaluate(() => {
  const api = window.__puzzle
  api.undo(); api.tick(1)
})
await page.waitForTimeout(200)
await page.evaluate(() => {
  const api = window.__puzzle
  api.redo(); api.tick(1)
})
await page.waitForTimeout(200)
if (!(await over.isVisible())) fail('回到进行中再解出一次,浮层没有重新抬起来')
else ok('回到进行中会重新武装')

// 四、undo 再 redo 不重复记。清掉存档里的记录,重报的话它会重新出现。
await page.evaluate((k) => localStorage.removeItem(k), SOLVED)
await page.evaluate(() => {
  const api = window.__puzzle
  api.undo(); api.tick(1)
  api.redo(); api.tick(1)
})
await page.waitForTimeout(200)
if (await stored()) fail('undo 再 redo 之后重报了一次:', await stored())
else ok('undo 再 redo 不重复记')

// 五、重开一局之后,新的一局可以再记
await page.evaluate(() => window.__puzzle.newGame())
await page.waitForTimeout(300)
if ((await status()) === 1) fail('新一局不该是已解出状态')
else ok('新一局重新开始计')

await browser.close()
console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
