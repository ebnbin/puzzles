// 停靠面板:够宽的屏幕(64em 起)上类型 / 菜单面板停靠成右侧栏。守六条:
//   一、让位不盖住:面板 360 宽、贴右缘,棋盘右边不越过面板左边。
//   二、非模态:面板开着,物理键盘照旧到得了引擎;Escape 不关它。
//   三、焦点归棋盘:指针在面板里点完预设 / 勾选 / 复制,焦点回到棋盘;用键盘走进面板
//       的人不被打扰,焦点留在原地。
//   四、记忆:开、关、切换写进 puzzles.panel,刷新和换游戏都按它复原;默认两个都关。
//   五、宽窄切换:收窄面板消失、不变成 sheet、记忆不动;拉宽按记忆回来;窄屏拉 sheet
//       不写记忆。
//   六、面板挂着的 config box 给键区让位:按 prefer 键、按会翻偏好的走子键之后,面板
//       的偏好段和自定义参数段都还在。
//   七、参数表常驻:列表里没有 Custom,点预设后表里变成它的参数、那条亮起来;参数
//       命不中任何预设时一条都不亮。
// 改了 PuzzleHost 的面板状态、PuzzleTypes、ConfigFields、ui/Dock、ui/useMedia、usePanel、
// useConfigBox 的 borrowPrefs / refreshInline,或 index.css 里 .dock / .puzzle[data-dock] 之后跑。
//
//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-dock.mjs
import { boot, open, URL_BASE } from './lib/boot.mjs'

const WIDE = { width: 1280, height: 800 }
const NARROW = { width: 900, height: 800 }

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }
const ok = (...m) => console.log('  ok  ', ...m)
const say = (cond, label, why = '') => (cond ? ok(label) : fail(label, why))

const { browser, page } = await boot({ viewport: WIDE })

const named = (name) => page.getByRole('button', { name }).first()
const dock = page.locator('.dock')
const sheet = page.locator('.sheet')
const remembered = () => page.evaluate(() => localStorage.getItem('puzzles.panel'))
const focusAt = () =>
  page.evaluate(() =>
    document.activeElement === document.body
      ? 'body'
      : document.activeElement?.className || document.activeElement?.tagName || 'null',
  )
const wait = (ms) => page.waitForTimeout(ms)

// apiRef.current 和 window.__puzzle 是同一个对象,包住 key 就数得到每一次转发。
const countKeys = () =>
  page.evaluate(() => {
    const api = window.__puzzle
    if (api.__counted) return
    const real = api.key.bind(api)
    api.key = (...a) => {
      window.__hits = (window.__hits || 0) + 1
      return real(...a)
    }
    api.__counted = true
  })
const hits = async (key = 'ArrowRight') => {
  await page.evaluate(() => {
    window.__hits = 0
  })
  await page.keyboard.press(key)
  await wait(80)
  return page.evaluate(() => window.__hits)
}

console.log('\n一、让位不盖住;二、非模态')
await open(page, 'Solo', { clear: ['puzzles.panel', 'puzzles.prefs.solo'] })
await countKeys()
say((await dock.count()) === 0 && (await sheet.count()) === 0, '默认两个面板都关着')
await named('Type').click()
await wait(400)
say((await dock.count()) === 1, '「类型」停靠成侧栏')
{
  const box = await dock.boundingBox()
  const canvas = await page.locator('.puzzle-canvas').boundingBox()
  say(Math.round(box.width) === 360, '面板 360 宽', `${box.width}`)
  say(Math.round(box.x + box.width) === WIDE.width, '贴着右缘', `${box.x + box.width}`)
  say(
    canvas.x + canvas.width <= box.x + 1,
    '棋盘让出宽度,没被盖住',
    `棋盘右边 ${Math.round(canvas.x + canvas.width)},面板左边 ${Math.round(box.x)}`,
  )
}
say((await dock.getAttribute('aria-label')) === 'Type', '面板标着「类型」')
say((await page.locator('.dock .sheet-custom').count()) === 1, '参数表常驻:面板一开就在')
say((await page.locator('.sheet-presets label', { hasText: 'Custom' }).count()) === 0, '列表里没有 Custom')
say((await focusAt()) === 'puzzle-canvas', '点开面板之后焦点在棋盘', await focusAt())
say((await hits()) > 0, '面板开着,键盘照旧归谜题')
await page.keyboard.press('Escape')
await wait(300)
say((await dock.count()) === 1, 'Escape 不关停靠面板')
say((await remembered()) === 'types', '记忆写成 types', await remembered())

console.log('\n三、焦点归棋盘')
{
  const chip = page.locator('.sheet-presets label[data-selected="false"]').first()
  const want = (await chip.textContent()).trim()
  await chip.click()
  await wait(1200)
  say((await dock.count()) === 1, '选预设后面板还在')
  say((await focusAt()) === 'puzzle-canvas', '选预设后焦点回棋盘', await focusAt())
  const got = (await page.locator('.sheet-presets label[data-selected="true"]').first().textContent()).trim()
  say(got === want, '选中项跟着引擎走', `想要 ${want},得到 ${got}`)
  // Solo 的预设名以「列x行」开头,表的第一条 slider 是列数。
  const cols = page.locator('.dock .sheet-custom .slider-value').first()
  const wantCols = want.replace(/Default$/, '').trim().split('x')[0]
  say((await cols.textContent()) === wantCols, '表里变成预设的参数', await cols.textContent())
}
await named('Menu').click()
await wait(400)
say((await dock.count()) === 1 && (await dock.getAttribute('aria-label')) === 'Menu', '「菜单」换进同一个侧栏')
say((await page.locator('.dock .sheet-actions').count()) === 1, '菜单的内容在')
say((await remembered()) === 'menu', '记忆写成 menu', await remembered())
say((await hits()) > 0, '菜单停靠着,键盘照旧归谜题')
{
  // prefer 键默认关着,Solo 的铅笔那一行就留在面板里。
  const check = page.locator('.dock .sheet-prefs input[type=checkbox]').first()
  say((await check.count()) === 1, '偏好那一行在面板里')
  const was = await check.isChecked()
  await check.click()
  await wait(300)
  say((await check.isChecked()) !== was, '指针勾选生效')
  say((await focusAt()) === 'puzzle-canvas', '指针勾完焦点回棋盘', await focusAt())
  const saved = await page.evaluate(() => localStorage.getItem('puzzles.prefs.solo') ?? '')
  say(saved.includes(`pencil-keep-highlight=${!was}`), '勾选真写进了偏好存档', saved)
  await check.focus()
  await page.keyboard.press(' ')
  await wait(300)
  say((await check.isChecked()) === was, '键盘 Space 也能勾')
  say((await focusAt()) === 'INPUT', '键盘操作后焦点留在面板里', await focusAt())
  await page.locator('.dock .sheet-id-value button').first().click()
  await wait(200)
  say((await focusAt()) === 'puzzle-canvas', '点完复制焦点回棋盘', await focusAt())
}
await named('Restart').click()
await wait(300)
say((await dock.count()) === 1, '菜单里的动作不收起停靠面板')

console.log('\n六、挂着的 config box 给键区让位')
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('puzzles.prefer', 'true'))
await open(page, 'Map', { clear: ['puzzles.prefs.map', 'puzzles.save.map'] })
await countKeys()
say((await dock.count()) === 1 && (await dock.getAttribute('aria-label')) === 'Menu', '换游戏按记忆复原成菜单')
const rows = () => page.locator('.dock .sheet-prefs label').count()
say((await rows()) > 0, 'Map 的面板留着 flash-type')
{
  const key = page.getByRole('button', { name: 'Number the regions' }).first()
  const lit = () => key.getAttribute('data-on')
  const before = await lit()
  await key.click()
  await wait(300)
  say((await lit()) !== before, 'prefer 键按了会变')
  say((await rows()) > 0, '按完 prefer 键面板的偏好段还在')
  // L 在棋盘上翻同一个开关,volatile 的重读走的也是借 box 那条路。
  await hits('l')
  await wait(300)
  say((await lit()) === before, '棋盘上按 L 翻回来,键面跟上')
  say((await rows()) > 0, '走子翻偏好之后面板还在')
  await named('Type').click()
  await wait(300)
  say((await page.locator('.dock .sheet-custom').count()) === 1, '自定义参数表在')
  await key.click()
  await wait(300)
  say((await page.locator('.dock .sheet-custom').count()) === 1, '按完 prefer 键自定义参数段还在')
  say((await lit()) !== before, 'prefer 键照样管用')
  // slider 松手:参数提交、发牌、面板还在、焦点回棋盘。fill 走的是原生 change,即松手。
  const width = page.locator('.dock .sheet-custom input[type=range]').first()
  const shown = page.locator('.dock .sheet-custom .slider-value').first()
  await width.fill('10')
  await wait(1500)
  say((await page.locator('.dock .sheet-custom').count()) === 1, '提交自定义参数后面板还在')
  say((await focusAt()) === 'puzzle-canvas', 'slider 松手提交后焦点回棋盘', await focusAt())
  const params = await page.evaluate(() => window.__puzzle.saveGame().match(/PARAMS\s*:\d+:(\S+)/)?.[1])
  say(params?.startsWith('10x'), '新参数生效', `${params}`)
  say((await shown.textContent()) === '10', 'slider 上是引擎现在的参数')
  say(
    (await page.locator('.dock .sheet-presets label[data-selected="true"]').count()) === 0,
    '命不中任何预设,一条都不亮',
  )
  // 点回一条预设:发一局、那条亮起来、表里变成它的参数(Map 的预设名以「宽x高」开头)。
  const preset = page.locator('.dock .sheet-presets label').first()
  const presetName = (await preset.textContent()).replace(/Default$/, '').trim()
  await preset.click()
  await wait(1500)
  say(await preset.evaluate((el) => el.dataset.selected === 'true'), '点了预设,它亮了')
  say((await shown.textContent()) === presetName.split('x')[0], '表里变成预设的参数', await shown.textContent())
  say((await focusAt()) === 'puzzle-canvas', '点预设后焦点回棋盘', await focusAt())
}

console.log('\n四、记忆;五、宽窄切换')
await page.locator('.dock-close').click()
await wait(300)
say((await dock.count()) === 0, '叉关掉面板')
say((await remembered()) === null, '关掉就清掉记忆', await remembered())
say((await focusAt()) === 'puzzle-canvas', '关掉之后焦点回棋盘', await focusAt())
await named('Menu').click()
await wait(300)
await named('Menu').click()
await wait(300)
say((await dock.count()) === 0 && (await remembered()) === null, '同一个键再按一次是收起')
await named('Type').click()
await wait(300)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.__puzzle, null, { timeout: 20000 })
await wait(400)
say((await dock.count()) === 1 && (await dock.getAttribute('aria-label')) === 'Type', '刷新后按记忆复原')
await page.setViewportSize(NARROW)
await wait(400)
say((await dock.count()) === 0 && (await sheet.count()) === 0, '收窄:面板消失,不变成 sheet')
say((await remembered()) === 'types', '收窄不动记忆', await remembered())
await page.setViewportSize(WIDE)
await wait(400)
say((await dock.count()) === 1, '拉宽:按记忆回来')
await page.setViewportSize(NARROW)
await wait(400)
await named('Menu').click()
await wait(300)
say((await sheet.count()) === 1, '窄屏拉起的是 sheet')
say((await remembered()) === 'types', '窄屏拉 sheet 不写记忆', await remembered())
await page.keyboard.press('Escape')
await wait(300)
say((await sheet.count()) === 0, 'Escape 关得掉 sheet')
await page.setViewportSize(WIDE)
await wait(400)
say((await dock.count()) === 1 && (await dock.getAttribute('aria-label')) === 'Type', '再拉宽还是记忆里的那个')

await browser.close()
console.log(bad === 0 ? '\n全绿' : `\n${bad} 处不对`)
process.exit(bad === 0 ? 0 : 1)
