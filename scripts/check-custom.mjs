//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-custom.mjs
//
// 改了 ConfigFields / ParamField、useConfigBox 的 commitInline、util/params.ts 的 settle,
// 或任一游戏的 types.params 之后跑(表本身对不对由 check-params.mjs 对着上游源码守)。
// 守五条:
//   一、四十个游戏的自定义面板里没有文本框:每个 string 控件都画成了滑块。
//   二、滑块落定就开新局,存档里的 PARAMS 跟着变;全程不出错误 Notice。
//   三、派生参数被夹:Mines 宽高缩到最小时雷数跟着降;Twiddle 宽降到 2 时旋转块降到 2;
//       Black Box「最少」拉过「最多」时「最多」跟上。
//   四、翻开关时数字跟着让:Mines 关掉 Ensure solubility 把宽拉到 1,再打开,宽回到 3。
//   五、−/+ 步进真的落定一档(Fifteen 宽 +1)。
import { boot, open } from './lib/boot.mjs'

const GAMES = [
  'Net', 'Cube', 'Fifteen', 'Sixteen', 'Twiddle', 'Rectangles', 'Netslide', 'Pattern',
  'Solo', 'Mines', 'Same Game', 'Flip', 'Guess', 'Pegs', 'Dominosa', 'Untangle',
  'Black Box', 'Slant', 'Light Up', 'Map', 'Loopy', 'Inertia', 'Tents', 'Bridges',
  'Unequal', 'Galaxies', 'Filling', 'Keen', 'Towers', 'Singles', 'Magnets', 'Signpost',
  'Range', 'Pearl', 'Undead', 'Unruly', 'Flood', 'Tracks', 'Palisade', 'Mosaic',
]

const { browser, page } = await boot()

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }

const named = (name) => page.getByRole('button', { name: new RegExp(`^${name}`) }).first()

// 存档里的 PARAMS 行就是这一局的参数串(midend.c:2212)。
const paramsNow = () =>
  page.evaluate(() => {
    const m = /^PARAMS\s*:\d+:(.*)$/m.exec(window.__puzzle.saveGame())
    return m ? m[1] : null
  })

async function openCustom() {
  await named('Type').click()
  await page.locator('.sheet-preset-custom input').click()
  await page.locator('.sheet-custom').waitFor({ timeout: 5000 })
  await page.waitForTimeout(150)
}

const textboxes = () => page.locator('.sheet-custom input[type=text]').count()
const notices = () => page.locator('.sheet-custom .notice').count()

// 按 label 找滑块;区间型带 ": Min" / ": Max" 后缀。
const slider = (label) => page.locator(`.sheet-custom input[type=range][aria-label="${label}"]`)
const stepper = (label, which) =>
  slider(label).locator('..').locator(`button[aria-label="${label}: ${which}"]`)
const valueOf = (label) => slider(label).getAttribute('aria-valuetext')

// 落定后新局要开、box 要重新拿到:等 PARAMS 变或 200ms。
async function press(label, key) {
  const before = await paramsNow()
  await slider(label).focus()
  await page.keyboard.press(key)
  await page.waitForFunction(
    (was) => {
      const m = /^PARAMS\s*:\d+:(.*)$/m.exec(window.__puzzle.saveGame())
      return (m ? m[1] : null) !== was
    },
    before,
    { timeout: 3000 },
  ).catch(() => {})
  await page.waitForTimeout(120)
}

// 一、二:逐个游戏开自定义面板,没有文本框;第一个滑块往右一档(不推到头:100 宽的
// 棋盘生成起来能卡几分钟,那是已知问题,不归这里测),参数串变了、没有错误 Notice。
for (const game of GAMES) {
  await open(page, game, { settle: 200 })
  await openCustom()
  const boxes = await textboxes()
  if (boxes) fail(game, `自定义面板还有 ${boxes} 个文本框`)
  const first = page.locator('.sheet-custom input[type=range]').first()
  const label = await first.getAttribute('aria-label')
  const before = await paramsNow()
  const atEnd = (await first.getAttribute('value')) === (await first.getAttribute('max'))
  await press(label, atEnd ? 'ArrowLeft' : 'ArrowRight')
  const after = await paramsNow()
  if ((await first.isDisabled()) === false && before === after)
    fail(game, `「${label}」动一档之后参数串没变:${before}`)
  if (await notices()) fail(game, `「${label}」动一档之后冒出了错误 Notice`)
  console.log(`  ok   ${game.padEnd(12)} ${before} → ${after}`)
}

// 三 a:Mines 宽高缩到最小,雷数跟着被夹到 ≤ 面积 − 9。
await open(page, 'Mines', { settle: 200 })
await openCustom()
await press('Width', 'Home')
await press('Height', 'Home')
{
  const p = await paramsNow()
  const m = /^(\d+)x(\d+)n(\d+)/.exec(p ?? '')
  if (!m) fail('Mines', `参数串认不出:${p}`)
  else if (Number(m[3]) > Number(m[1]) * Number(m[2]) - 9)
    fail('Mines', `雷数没被夹:${p}`)
  else console.log(`  ok   Mines 缩到最小 ${p}`)
  if (await notices()) fail('Mines', '缩到最小时冒出了错误 Notice')
}

// 四:关掉 Ensure solubility 把宽拉到 1,再打开开关,宽回到 3。
{
  const unique = page.locator('.sheet-custom input[type=checkbox]').first()
  await unique.uncheck()
  await page.waitForTimeout(300)
  await press('Width', 'Home')
  let p = await paramsNow()
  if (!/^1x/.test(p ?? '')) fail('Mines', `不保证可解时宽应能到 1:${p}`)
  await unique.check()
  await page.waitForTimeout(400)
  p = await paramsNow()
  if (!/^3x/.test(p ?? '')) fail('Mines', `打开 Ensure solubility 后宽应回到 3:${p}`)
  else console.log(`  ok   Mines 翻开关后 ${p}`)
  if (await notices()) fail('Mines', '翻开关后冒出了错误 Notice')
}

// 三 b:Twiddle 宽降到 2,旋转块边长跟着降到 2。
await open(page, 'Twiddle', { settle: 200 })
await openCustom()
await press('Rotating block size', 'End')
await press('Width', 'Home')
{
  const p = await paramsNow()
  if (!/^2x\d+n2/.test(p ?? '')) fail('Twiddle', `宽降到 2 时旋转块应为 2:${p}`)
  else console.log(`  ok   Twiddle ${p}`)
  if (await notices()) fail('Twiddle', '冒出了错误 Notice')
}

// 三 c:Black Box「最少」推到头,「最多」跟上;再把「最多」拉回最小,两者相等写回单个数。
await open(page, 'Black Box', { settle: 200 })
await openCustom()
await press('No. of balls: Min', 'End')
{
  const p = await paramsNow()
  const m = /m(\d+)M(\d+)/.exec(p ?? '')
  if (!m || Number(m[1]) > Number(m[2])) fail('Black Box', `最少拉过最多后最多没跟上:${p}`)
  else console.log(`  ok   Black Box ${p}`)
  const [lo, hi] = [await valueOf('No. of balls: Min'), await valueOf('No. of balls: Max')]
  if (lo !== hi) fail('Black Box', `两个滑块读数应相等:${lo} / ${hi}`)
  if (await notices()) fail('Black Box', '冒出了错误 Notice')
}

// 五:步进按钮 Fifteen 宽 +1(存档里可能是上一轮扫过的尺寸,按相对值断言)。
await open(page, 'Fifteen', { settle: 200 })
await openCustom()
{
  const before = await paramsNow()
  await stepper('Width', 'One step up').click()
  await page.waitForTimeout(400)
  const p = await paramsNow()
  const w = (s) => Number(/^(\d+)x/.exec(s ?? '')?.[1])
  if (w(p) !== w(before) + 1) fail('Fifteen', `宽 +1 应从 ${before} 到宽加一:${p}`)
  else console.log(`  ok   Fifteen 步进 ${before} → ${p}`)
}

await browser.close()
console.log(bad ? `\n${bad} 处没过` : '\n全部通过')
process.exit(bad ? 1 : 0)
