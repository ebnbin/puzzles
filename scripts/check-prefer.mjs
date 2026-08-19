//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-prefer.mjs
//
// 改了 games/util/keys.ts 的 preferKeys、useConfigBox 的 borrowPrefs、createPuzzle 的
// loadPrefs、任何一个游戏文件里的 Prefer 常量或 prefs.defaults,或者升级 vendor/ 之后跑。
// 守七条:
//   一、认控件只能按英文 label(emcc 只把 name 交给 JS,kw 到不了这一侧)。上游改了
//       那句话,键会「消失」而不是「按下去没反应」——下面逐个游戏点名断言它还在。
//   二、按一下真的写进了上游的偏好存档,不是只把键面点亮(Solo 走完整一圈)。
//   三、多个键时按上游 get_prefs 的先后排,而不是游戏文件里的书写序。
//   四、多选一的键一按走下一格、走到头绕回,且脸跟着换。
//   五、下游换掉的默认值(prefs.defaults)开局到位,且压不过用户自己存过的那一条。
//   六、键区摆出来的那几条从偏好面板里撤掉;总开关一关,面板恢复原样。
//   七、裸字母快捷键那条归全局设置(useShortcuts):不进任何游戏的面板,而且真的
//       压得住——开着按 n 换一局,关掉按 n 什么都不发生。
import { boot, open, URL_BASE } from './lib/boot.mjs'

// 每个游戏该有几个 prefer 键。数目对不上就是某条 label 没认出来。
const EXPECT = [
  ['Net', 1], ['Solo', 1], ['Guess', 1], ['Untangle', 3], ['Slant', 1],
  ['Light Up', 1], ['Map', 2], ['Loopy', 2], ['Bridges', 1], ['Unequal', 1],
  ['Keen', 1], ['Towers', 2], ['Singles', 1], ['Pearl', 1], ['Undead', 3],
  ['Palisade', 1],
]

const PREFS = 'puzzles.prefs.solo'
const KW = 'pencil-keep-highlight'

const { browser, page } = await boot()

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }
const ok = (...m) => console.log('  ok  ', ...m)

// open() 只管 arrows,别的开关得自己先摆好——它不会替我们清掉。
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('puzzles.prefer', 'true')
  localStorage.setItem('puzzles.aid', 'true')
})

const keys = page.locator(".keypad button[data-kind='prefer']")

console.log('每个游戏的 prefer 键数(label 认不出就会少)')
for (const [game, want] of EXPECT) {
  await open(page, game, { clear: [] })
  const got = await keys.count()
  if (got === want) ok(`${game} ${got} 个`)
  else fail(`${game} 应当 ${want} 个,数到 ${got} 个——多半是上游改了那句 label`)
}

console.log('\n组序:prefer 收尾')
for (const game of ['Map', 'Guess']) {
  await open(page, game, { clear: [] })
  const kinds = await page.evaluate(() =>
    [...document.querySelectorAll('.keypad button')].map((b) => b.getAttribute('data-kind')),
  )
  const order = ['entry', 'pick', 'assist', 'prefer']
  const sorted = kinds.every((k, i) => i === 0 || order.indexOf(kinds[i - 1]) <= order.indexOf(k))
  if (sorted && kinds.at(-1) === 'prefer') ok(`${game} ${kinds.join(' ')}`)
  else fail(`${game} 组序不对:${kinds.join(' ')}`)
}

console.log('\n下游换掉的默认值')
// 五个数独族游戏的 pencil-keep-highlight(declare.ts 的 keepPencil)、guess 的
// show-labels、bridges 的 show-hints,上游默认都是 false,这边都翻成 true。
for (const game of ['Solo', 'Unequal', 'Keen', 'Towers', 'Undead', 'Guess', 'Bridges']) {
  await open(page, game, { clear: [`puzzles.prefs.${game.toLowerCase()}`] })
  if ((await keys.first().getAttribute('data-on')) === 'true') ok(`${game} 开局就是亮的`)
  else fail(`${game} 开局该亮不亮——申报的默认值没到位`)
}
// 存档压过申报:两者都在时,逐行赋值后写的赢,所以用户存的那一条说了算。
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate((k) => localStorage.setItem(k, 'pencil-keep-highlight=false\n'), PREFS)
await open(page, 'Solo', { clear: [] })
if ((await keys.first().getAttribute('data-on')) === null) ok('存档里明写 false,申报让位')
else fail('存档没压过申报的默认值')

console.log('\nSolo 走完整一圈')
await open(page, 'Solo', { clear: [PREFS, 'puzzles.save.solo'] })
const key = keys.first()
const lit = () => key.getAttribute('data-on')
const saved = () => page.evaluate((k) => localStorage.getItem(k), PREFS)

await key.click()
await page.waitForTimeout(200)
if ((await lit()) === null) ok('按一下:键面灭了')
else fail('按一下之后键面没灭')
if (new RegExp(`${KW}=false`).test((await saved()) ?? '')) ok(`存档里 ${KW}=false`)
else fail('存档没写成 false:', await saved())

await key.click()
await page.waitForTimeout(200)
if ((await lit()) === 'true') ok('再按一下:亮了')
else fail('再按之后没亮')
if (new RegExp(`${KW}=true`).test((await saved()) ?? '')) ok(`存档里 ${KW}=true`)
else fail('存档没写回 true:', await saved())

// 键区已经摆出来的那条要从面板里撤掉。Solo 的游戏偏好只有这一条,裸字母那条又
// 归全局设置,所以整个偏好设置栏都不该画出来。
const panelRows = () => page.evaluate(() =>
  [...document.querySelectorAll('.sheet-prefs label')].map((l) => (l.textContent ?? '').trim()),
)
const panelChecked = (part) => page.evaluate((p) => {
  const box = [...document.querySelectorAll('.sheet-prefs input[type=checkbox]')]
    .find((b) => (b.closest('label')?.textContent ?? '').includes(p))
  return box ? box.checked : null
}, part)

await page.getByRole('button', { name: /Menu/i }).first().click()
await page.waitForTimeout(400)
const soloRows = await panelRows()
if (soloRows.length === 0) ok('Solo 的偏好设置栏整段不画')
else fail('偏好设置栏还留着:', JSON.stringify(soloRows))

// 总开关关掉:键没了,那一行必须回来——而且读的和键区是同一个真值。
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('puzzles.prefer', 'false'))
await open(page, 'Solo', { clear: [] })
if ((await keys.count()) === 0) ok('总开关关掉,偏好键不出现')
else fail('总开关关掉还有偏好键')
await page.getByRole('button', { name: /Menu/i }).first().click()
await page.waitForTimeout(400)
if ((await panelChecked('pencil mark')) === true) ok('那一行回来了,勾的状态和键区一致')
else fail('偏好面板和键区对不上:', JSON.stringify(await panelRows()))
if (!(await panelRows()).some((r) => /Ctrl/i.test(r))) ok('裸字母那条两种开关下都不进面板')
else fail('裸字母那条露在面板里了')
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('puzzles.prefer', 'true'))

console.log('\n裸字母快捷键归全局设置')
// Map 留着 flash-type:撤的是键区认领的那几条 + 裸字母那条,不是把整段清空。
await open(page, 'Map', { clear: ['puzzles.prefs.map', 'puzzles.save.map'] })
await page.getByRole('button', { name: /Menu/i }).first().click()
await page.waitForTimeout(400)
const mapRows = await panelRows()
if (mapRows.some((r) => /flash/i.test(r))) ok('Map 还留着 flash-type(撤的不是整段)')
else fail('Map 的面板被清空了:', JSON.stringify(mapRows))
if (!mapRows.some((r) => /Ctrl/i.test(r))) ok('裸字母那条也不在 Map 的面板里')
else fail('裸字母那条还在 Map 的面板里')

// 全局开关真的压住了每个游戏的存档:开着按 n 换一局,关掉按 n 什么都不发生。
const boardHash = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const g = c.getContext('2d', { willReadFrequently: true })
  const d = g.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0
  return h
})
for (const [flag, want] of [['true', true], ['false', false]]) {
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((f) => localStorage.setItem('puzzles.shortcuts', f), flag)
  await open(page, 'Net', { clear: ['puzzles.save.net'] })
  const before = await boardHash()
  await page.evaluate(() => document.querySelector('canvas')?.focus())
  await page.keyboard.press('n')
  await page.waitForTimeout(600)
  const dealt = (await boardHash()) !== before
  if (dealt === want) ok(`全局开关 ${flag}:按 n ${dealt ? '换了一局' : '什么都没发生'}`)
  else fail(`全局开关 ${flag}:按 n 之后 dealt=${dealt}`)
}
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.removeItem('puzzles.shortcuts'))

console.log('\n多选一:一按走下一格,走到头绕回')
await open(page, 'Undead', { clear: ['puzzles.prefs.undead', 'puzzles.save.undead'] })
// 上游序:pencil-keep-highlight、monsters、count-style,所以第三个是三态那个。
const cycle = keys.nth(2)
const undeadSaved = () => page.evaluate(() => localStorage.getItem('puzzles.prefs.undead'))
const styleNow = async () => /count-style=(\S+)/.exec((await undeadSaved()) ?? '')?.[1] ?? '(未写)'
const glyphNow = () => cycle.evaluate((b) => b.querySelector('svg')?.innerHTML.slice(0, 40) ?? '')

const seen = []
const faces = [await glyphNow()]
for (let i = 0; i < 3; i++) {
  await cycle.click()
  await page.waitForTimeout(200)
  seen.push(await styleNow())
  faces.push(await glyphNow())
}
if (seen.join(' → ') === 'remaining → placed-total → total')
  ok('count-style 走了一圈:total →', seen.join(' → '))
else fail('count-style 循环不对:', seen.join(' → '))

if (new Set(faces.slice(0, 3)).size === 3 && faces[3] === faces[0])
  ok('三张脸各不相同,绕回来又是第一张')
else fail('脸没跟着换:', faces.map((f) => f.length).join('/'))

// 多选一没有「开」这一说:三格都不该点亮。
const litAny = await cycle.getAttribute('data-on')
if (litAny === null) ok('多选一的键不点亮(状态全由脸说)')
else fail('多选一的键被点亮了:data-on=' + litAny)

await browser.close()
console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
