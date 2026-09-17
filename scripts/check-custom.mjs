//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-custom.mjs
//
// 改了 ConfigFields / ParamField、useConfigBox 的 commitInline、util/params.ts 的 settle
// 之后跑全量。只改了某一个游戏的 types.params,跑 `node scripts/check-custom.mjs 'Light Up'`
// 就够——只走那个游戏的一、二条,后面五条守的是面板机制、和单个游戏的表无关。
// 表本身对不对由 check-params.mjs 对着上游源码守(它也认游戏名,而且是秒级)。
// 守十五条:
//   一、四十个游戏的自定义面板里没有文本框、没有下拉框:string 控件都画成了滑块,choices
//       都画成了分段按钮(申报了 ordinal 的画成滑块)。
//   二、滑块落定就开新局,存档里的 PARAMS 跟着变;全程不出错误 Notice。
//   三、派生参数被夹:Mines 宽高缩到最小时雷数跟着降;Twiddle 短边缩小时旋转块跟着降(6×5 上块 4 被推到 3);
//       Black Box「最少」拉过「最多」时「最多」跟上。
//   四、翻开关时数字跟着让:Solo 勾上 Killer,阶数被夹到 ≤ 9。
//   五、−/+ 步进真的落定一档(Fifteen 宽 +1)。
//   六、参数列表常驻,和上面的预设互相跟随:点预设参数跟着换,参数滑回某个预设
//       身上选中态就跳回那个预设,滑开就一条都不选中(= 自定义)。
//   七、够宽的桌面上面板停靠在右侧栏:没有 scrim、不盖棋盘、开着也照样能走子;
//       面板开着时「类型」键当开关用,再点一次收起、又点一次参数列表还在。
//   八、分段按钮一点即落定:Map 点「Hard」,参数串以 dh 结尾、按钮带选中态。
//   九、下拉装的数值阶梯是滑块:Bridges「Max. bridges per direction」右一档,桥数加一,
//       读数是选项文字。
//   十、对等参数互推:Net 宽拉到头 49,高被推到 4:1 内最近的 13;高拉到最小 3,宽被推到 11。
//   十一、成对表互推:Cube 从预设 4×4 把宽拉到头 16,高 4 配得上不动;再把高拉到头 16,宽被推到 4。
//   十二、面积下限也走互推:Fifteen 高拉到最小 2,再把宽拉到最小 2,高被推到 3(2×2 不到面积 6)。
//   十三、门:Sixteen 的打乱步数默认关着、滑块不画;打开写 1;步数拉到头等于 w+h,宽缩到 2 后
//       被推到新的 w+h;关掉后参数串里没有 m。
//   十四、整行不画:Solo 勾上 Jigsaw 后行数滑块不画、值钉在 1(列数不动);勾掉后滑块回来、
//       行数落到最小的 2。
//   十五、面板顺序:Solo 申报了 types.order,Jigsaw 画在列数上面,其余照上游。
import { boot, open } from './lib/boot.mjs'

const GAMES = [
  'Net', 'Cube', 'Fifteen', 'Sixteen', 'Twiddle', 'Rectangles', 'Netslide', 'Pattern',
  'Solo', 'Mines', 'Same Game', 'Flip', 'Guess', 'Pegs', 'Dominosa', 'Untangle',
  'Black Box', 'Slant', 'Light Up', 'Map', 'Loopy', 'Inertia', 'Tents', 'Bridges',
  'Unequal', 'Galaxies', 'Filling', 'Keen', 'Towers', 'Singles', 'Magnets', 'Signpost',
  'Range', 'Pearl', 'Undead', 'Unruly', 'Flood', 'Tracks', 'Palisade', 'Mosaic',
]

// 只给游戏名就只走一、二条(逐游戏那部分);不给就全量,后面五条也一起跑。
const only = process.argv.slice(2)
const walk = only.length ? GAMES.filter((g) => only.includes(g)) : GAMES
for (const name of only)
  if (!GAMES.includes(name)) throw new Error(`没有叫「${name}」的游戏`)

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

// 参数列表不用再选「自定义」才出来:面板一开就在。桌面停靠时默认已经展开,那就不点
// (点了是收起)。
async function openTypes() {
  if (!(await page.locator('.sheet-params').count())) await named('Type').click()
  await page.locator('.sheet-params').waitFor({ timeout: 5000 })
  await page.waitForTimeout(150)
}

// 此刻选中的那一条预设的文字。
const chosen = () =>
  page.$$eval('.sheet-presets label[data-selected=true]', (ls) =>
    ls.map((l) => l.textContent.trim()).join(' / '),
  )

const textboxes = () => page.locator('.sheet-params input[type=text]').count()
const dropdowns = () => page.locator('.sheet-params select').count()
const notices = () => page.locator('.sheet-params .notice').count()

// 按 label 找滑块;区间型带 ": Min" / ": Max" 后缀。
const slider = (label) => page.locator(`.sheet-params input[type=range][aria-label="${label}"]`)
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

// 一、二:逐个游戏开参数面板,没有文本框;第一个滑块往右一档(不推到头:100 宽的
// 棋盘生成起来能卡几分钟,那是已知问题,不归这里测),参数串变了、没有错误 Notice。
for (const game of walk) {
  await open(page, game, { settle: 200 })
  await openTypes()
  const boxes = await textboxes()
  if (boxes) fail(game, `自定义面板还有 ${boxes} 个文本框`)
  const drops = await dropdowns()
  if (drops) fail(game, `自定义面板还有 ${drops} 个下拉框`)
  const first = page.locator('.sheet-params input[type=range]').first()
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

// 给了游戏名就到此为止:后面五条守的是面板机制(派生参数被夹、开关让路、步进、
// 预设跟随、桌面停靠),各自钉死在某一两个游戏上,和「改了哪个游戏的表」无关。
if (only.length) {
  await browser.close()
  console.log(bad ? `\n${bad} 处没过` : '\n全部通过')
  process.exit(bad ? 1 : 0)
}

// 三 a:Mines 宽高缩到最小,雷数跟着被夹到 ≤ 面积 − 9。
await open(page, 'Mines', { settle: 200 })
await openTypes()
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

// 四:翻开关时数字跟着让——Solo 勾上 Killer,阶数被夹到 ≤ 9(solo.c:522)。
await open(page, 'Solo', { settle: 200 })
await openTypes()
await press('Columns of sub-blocks', 'End')
await press('Rows of sub-blocks', 'End')
{
  const killer = page.locator('.sheet-params label', { hasText: 'Killer' }).locator('input')
  await killer.check()
  await page.waitForTimeout(500)
  const p = await paramsNow()
  const m = /^(\d+)x(\d+)/.exec(p ?? '')
  if (!m) fail('Solo', `参数串认不出:${p}`)
  else if (Number(m[1]) * Number(m[2]) > 9) fail('Solo', `勾了 Killer 阶数应 ≤ 9:${p}`)
  else console.log(`  ok   Solo 勾上 Killer ${p}`)
  if (await notices()) fail('Solo', '勾上 Killer 后冒出了错误 Notice')
}

// 三 b:Twiddle 从预设 6x6n4 起:高降到 5,2·6+5 = 17 < 18,块被推到 3;宽加到 7 后 7×5 放得下 4,
// 但块不自动升,留在 3;宽降到 2,块降到 2。
await open(page, 'Twiddle', { settle: 200 })
await openTypes()
await page.locator('.sheet-presets label', { hasText: '6x6, rotating' }).first().click()
await page.waitForTimeout(500)
{
  await press('Height', 'ArrowLeft')
  let p = await paramsNow()
  if (p !== '6x5n3') fail('Twiddle', `高降到 5 时块应被推到 3:${p}`)
  else console.log(`  ok   Twiddle 高降到 5 → ${p}`)
  await press('Width', 'ArrowRight')
  p = await paramsNow()
  if (p !== '7x5n3') fail('Twiddle', `宽加到 7 时块应留在 3:${p}`)
  else console.log(`  ok   Twiddle 宽加到 7 → ${p}`)
  await press('Width', 'Home')
  p = await paramsNow()
  if (p !== '2x5n2') fail('Twiddle', `宽降到 2 时块应降到 2:${p}`)
  else console.log(`  ok   Twiddle 宽降到 2 → ${p}`)
  if (await notices()) fail('Twiddle', '冒出了错误 Notice')
}

// 三 c:Black Box「最少」推到头,「最多」跟上;再把「最多」拉回最小,两者相等写回单个数。
await open(page, 'Black Box', { settle: 200 })
await openTypes()
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
await openTypes()
{
  const before = await paramsNow()
  await stepper('Width', 'One step up').click()
  await page.waitForTimeout(400)
  const p = await paramsNow()
  const w = (s) => Number(/^(\d+)x/.exec(s ?? '')?.[1])
  if (w(p) !== w(before) + 1) fail('Fifteen', `宽 +1 应从 ${before} 到宽加一:${p}`)
  else console.log(`  ok   Fifteen 步进 ${before} → ${p}`)
}

// 六:预设与参数互相跟随。
await open(page, 'Mines', { settle: 200 })
await openTypes()
{
  await page.getByText('16x16, 40 mines').click()
  await page.waitForTimeout(500)
  const read = async () => [
    await valueOf('Width'),
    await valueOf('Height'),
    (await valueOf('Mines')).split(' ')[0],
  ]
  if ((await read()).join('x') !== '16x16x40')
    fail('跟随', `点了预设参数没跟着换:${(await read()).join(' ')}`)
  else if (!(await chosen()).startsWith('16x16, 40 mines'))
    fail('跟随', `点了预设选中态不对:${await chosen()}`)
  else console.log(`  ok   跟随 点预设 → ${(await read()).join(' ')} / ${await chosen()}`)

  // 滑开一档 → 一条都不选中
  await press('Width', 'ArrowLeft')
  if ((await chosen()) !== '') fail('跟随', `滑开之后不该有选中的:${await chosen()}`)
  else console.log(`  ok   跟随 滑开一档 → ${await paramsNow()} / 无选中`)

  // 滑回去 → 选中态跳回那个预设
  await press('Width', 'ArrowRight')
  if (!(await chosen()).startsWith('16x16, 40 mines'))
    fail('跟随', `滑回预设身上应重新选中它:${await paramsNow()} / ${await chosen()}`)
  else console.log(`  ok   跟随 滑回去 → ${await paramsNow()} / ${await chosen()}`)
  if (await notices()) fail('跟随', '冒出了错误 Notice')
}

// 七:桌面停靠。这一条守的是「让出宽度」而不是「盖上去」——盖住了棋盘还在,
// 截图也看不出错,只有量边界能发现。
await page.setViewportSize({ width: 1280, height: 900 })
await open(page, 'Fifteen', { settle: 200 })
await openTypes()
{
  const dock = await page.locator('.dock').boundingBox()
  const canvas = await page.locator('.puzzle-canvas').boundingBox()
  if (await page.locator('.sheet-dimmer').count()) fail('停靠', '不该还有 scrim')
  if (Math.round(dock.width) !== 360) fail('停靠', `面板应是 360 宽:${dock.width}`)
  if (canvas.x + canvas.width > dock.x + 1)
    fail('停靠', `棋盘右边 ${Math.round(canvas.x + canvas.width)} 越过了面板左边 ${dock.x}`)
  else console.log(`  ok   停靠 面板 ${dock.width} 宽,棋盘右边 ${Math.round(canvas.x + canvas.width)}`)
  if (await textboxes()) fail('停靠', '面板里还有文本框')
  if (await dropdowns()) fail('停靠', '面板里还有下拉框')

  // 滑块照旧落定
  const was = await paramsNow()
  await press('Width', 'ArrowRight')
  if ((await paramsNow()) === was) fail('停靠', `动一档参数串没变:${was}`)
  if (await notices()) fail('停靠', '动一档之后冒出了错误 Notice')

  // 停靠时「类型」键还点得到:它是开关。以前再点一次会把常驻的参数列表拆掉、
  // 而且往一个已经关掉的 config box 上再发一次 cancel,wasm 当场 trap。
  await named('Type').click()
  await page.waitForTimeout(400)
  if (await page.locator('.dock').count()) fail('停靠', '再点一次「类型」应收起面板')
  await openTypes()
  if (!(await page.locator('.sheet-params input[type=range]').count()))
    fail('停靠', '收起再打开之后参数列表没回来')
  else console.log('  ok   停靠 「类型」键当开关,收起再开参数列表还在')
  await page.locator('.sheet-presets label', { hasText: '4x4' }).first().click()
  await page.waitForTimeout(500)
  if ((await paramsNow()) !== '4x4')
    fail('停靠', `收起再开之后点预设应换到 4x4:${await paramsNow()}`)
  if (await notices()) fail('停靠', '收起再开之后点预设冒出了错误 Notice')

  // 面板开着,棋盘照样能走子(停靠不算覆盖层)
  const before = await page.evaluate(() => window.__puzzle.saveGame())
  await page.locator('.puzzle-canvas').click()
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    await page.keyboard.press(key)
  await page.waitForTimeout(200)
  if ((await page.evaluate(() => window.__puzzle.saveGame())) === before)
    fail('停靠', '面板开着时方向键没到谜题')
  else console.log('  ok   停靠 面板开着照样走子')
}

await page.locator('.dock-close').click()
await page.waitForTimeout(300)
{
  if (await page.locator('.dock').count()) fail('停靠', '收起后面板还在')
  if (await page.locator('.puzzle[data-dock]').count()) fail('停靠', '收起后棋盘没拿回宽度')
  else console.log('  ok   停靠 收起后棋盘拿回宽度')
}

// 八:分段按钮一点即落定。Map 的难度 dn → dh,点过的按钮带选中态,不出 Notice。
await page.setViewportSize({ width: 390, height: 844 })
await open(page, 'Map', { settle: 200 })
await openTypes()
{
  const chip = (text) => page.locator('.sheet-params .dialog-choice .segmented label', { hasText: text }).first()
  await chip('Hard').click()
  await page.waitForTimeout(500)
  const p = await paramsNow()
  if (!/dh$/.test(p ?? '')) fail('Map', `点「Hard」后参数串应以 dh 结尾:${p}`)
  else if ((await chip('Hard').getAttribute('data-selected')) !== 'true') fail('Map', '点过的按钮没有选中态')
  else console.log(`  ok   Map 点「Hard」→ ${p}`)
  if (await notices()) fail('Map', '点难度后冒出了错误 Notice')
}

// 九:下拉装的数值阶梯是滑块。Bridges 的桥数右一档 m2 → m3,读数是选项文字。
await open(page, 'Bridges', { settle: 200 })
await openTypes()
{
  const label = 'Max. bridges per direction'
  if (!(await slider(label).count())) fail('Bridges', `「${label}」应是滑块`)
  else {
    const before = await paramsNow()
    await press(label, 'ArrowRight')
    const after = await paramsNow()
    const m = (s) => Number(/m(\d+)/.exec(s ?? '')?.[1])
    if (m(after) !== m(before) + 1) fail('Bridges', `桥数右一档应加一:${before} → ${after}`)
    else if ((await valueOf(label)) !== String(m(after))) fail('Bridges', `读数应是选项文字:${await valueOf(label)}`)
    else console.log(`  ok   Bridges 桥数滑块 ${before} → ${after}`)
    if (await notices()) fail('Bridges', '冒出了错误 Notice')
  }
}

// 十:对等参数互推。Net 的宽高档位都是全表,动一根另一根被推到 4:1 内最近的合法档。
await open(page, 'Net', { settle: 200 })
await openTypes()
{
  await press('Width', 'End')
  let p = await paramsNow()
  if (!/^49x13\b/.test(p ?? '')) fail('Net', `宽拉到头后高应被推到 13:${p}`)
  else console.log(`  ok   Net 宽 49 → ${p}`)
  await press('Height', 'Home')
  p = await paramsNow()
  if (!/^11x3\b/.test(p ?? '')) fail('Net', `高拉到最小后宽应被推到 11:${p}`)
  else console.log(`  ok   Net 高 3 → ${p}`)
  if (await notices()) fail('Net', '互推后冒出了错误 Notice')
}

// 十一:成对表互推。Cube 的宽高档位是该立体的全表,动一根另一根被推到配得上的最近一档。
// 先点回预设 Cube:前面逐游戏那轮把宽动过一档。
await open(page, 'Cube', { settle: 200 })
await openTypes()
{
  await page.locator('.sheet-presets label', { hasText: 'Cube' }).first().click()
  await page.waitForTimeout(500)
  await press('Width / top', 'End')
  let p = await paramsNow()
  if (p !== 'c16x4') fail('Cube', `宽拉到头后应是 16×4:${p}`)
  else console.log(`  ok   Cube 宽 16 → ${p}`)
  await press('Height / bottom', 'End')
  p = await paramsNow()
  if (p !== 'c4x16') fail('Cube', `高拉到头后宽应被推到 4:${p}`)
  else console.log(`  ok   Cube 高 16 → ${p}`)
  if (await notices()) fail('Cube', '互推后冒出了错误 Notice')
}

// 十二:面积下限也走互推。Fifteen 高拉到最小 2,宽被推进 4:1;再把宽拉到最小 2,高被推到 3。
await open(page, 'Fifteen', { settle: 200 })
await openTypes()
{
  await press('Height', 'Home')
  await press('Width', 'Home')
  const p = await paramsNow()
  if (p !== '2x3') fail('Fifteen', `宽高都拉到最小后应是 2×3:${p}`)
  else console.log(`  ok   Fifteen 最小 → ${p}`)
  if (await notices()) fail('Fifteen', '互推后冒出了错误 Notice')
}

// 十三:门。Sixteen 的打乱步数由「限定打乱步数」开关管:关着时滑块不画、值是 0。
await open(page, 'Sixteen', { settle: 200 })
await openTypes()
{
  const moves = 'Number of shuffling moves'
  const toggle = page.locator('.sheet-params .dialog-boolean input[type=checkbox]').first()
  await page.locator('.sheet-presets label', { hasText: '4x4' }).first().click()
  await page.waitForTimeout(500)
  if (await toggle.isChecked()) fail('Sixteen', '预设 4x4 下门应该是关的')
  if (await slider(moves).count()) fail('Sixteen', '门关着时不该画步数滑块')
  await toggle.click()
  await page.waitForTimeout(500)
  let p = await paramsNow()
  if (p !== '4x4m1') fail('Sixteen', `打开门后应写 1:${p}`)
  else console.log(`  ok   Sixteen 开门 → ${p}`)
  await press(moves, 'End')
  p = await paramsNow()
  if (p !== '4x4m8') fail('Sixteen', `步数拉到头应是 w+h = 8:${p}`)
  else console.log(`  ok   Sixteen 步数到头 → ${p}`)
  await press('Width', 'Home')
  p = await paramsNow()
  if (p !== '2x4m6') fail('Sixteen', `宽缩到 2 后步数应被推到 6:${p}`)
  else console.log(`  ok   Sixteen 宽缩到 2 → ${p}`)
  await toggle.click()
  await page.waitForTimeout(500)
  p = await paramsNow()
  if (p !== '2x4') fail('Sixteen', `关门后参数串不该带 m:${p}`)
  else console.log(`  ok   Sixteen 关门 → ${p}`)
  if (await notices()) fail('Sixteen', '开关门后冒出了错误 Notice')
}

// 十四:整行不画。Solo 的行数由上游自己的 Jigsaw 勾选框管(r = 1 与 Jigsaw 是同一件事):
// 勾着时钉在 1、整行不画,勾掉时从 2 起;两边都不动列数。
await open(page, 'Solo', { settle: 200 })
await openTypes()
{
  const rows = 'Rows of sub-blocks'
  const box = page
    .locator('.sheet-params label.dialog-boolean', { hasText: /Jigsaw/ })
    .locator('input[type=checkbox]')
  await page.locator('.sheet-presets label', { hasText: '3x3 Basic' }).first().click()
  await page.waitForTimeout(500)
  if (await box.isChecked()) fail('Solo', '预设 3x3 Basic 下 Jigsaw 不该是勾着的')
  await press(rows, 'Home')
  let p = await paramsNow()
  if (p !== '3x2db') fail('Solo', `行数拉到最小应是 2:${p}`)
  else console.log(`  ok   Solo 行数最小 → ${p}`)
  await box.click()
  await page.waitForTimeout(500)
  if (await slider(rows).count()) fail('Solo', '勾上 Jigsaw 后不该画行数滑块')
  p = await paramsNow()
  if (p !== '3jdb') fail('Solo', `勾上 Jigsaw 后列数不动、行数钉 1:${p}`)
  else console.log(`  ok   Solo 勾 Jigsaw → ${p}`)
  await box.click()
  await page.waitForTimeout(500)
  if (!(await slider(rows).count())) fail('Solo', '勾掉 Jigsaw 后行数滑块该回来')
  p = await paramsNow()
  if (p !== '3x2db') fail('Solo', `勾掉 Jigsaw 后行数应回到 2:${p}`)
  else console.log(`  ok   Solo 取消 Jigsaw → ${p}`)
  if (await notices()) fail('Solo', '开关 Jigsaw 后冒出了错误 Notice')
}

// 十五:面板顺序。Solo 申报了 types.order,把 Jigsaw 提到列数上面(它决定行数画不画),
// 其余四个照上游。只换画的顺序,提交仍按 C 给的下标回填。
{
  const rows = await page.evaluate(() => {
    const box = document.querySelector('.sheet-params')
    if (!box) return []
    return [...box.children]
      .filter((el) => !el.classList.contains('notice'))
      .map((el) => (el.querySelector('.dialog-param-head') ?? el).textContent.trim())
  })
  const want = [
    'Jigsaw (irregularly shaped sub-blocks)',
    'Columns of sub-blocks',
    'Rows of sub-blocks',
    '"X" (require every number in each main diagonal)',
    'Killer (digit sums)',
    'Symmetry',
    'Difficulty',
  ]
  if (rows.join(' | ') !== want.join(' | '))
    fail('Solo', `面板顺序不对:${rows.join(' | ')}`)
  else console.log('  ok   Solo 面板顺序 Jigsaw 在最上')
}

await browser.close()
console.log(bad ? `\n${bad} 处没过` : '\n全部通过')
process.exit(bad ? 1 : 0)
