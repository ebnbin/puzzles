//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-prefer.mjs
//
// 改了 games/util/keys.ts 的 preferKeys、useConfigBox 的 borrowPrefs、createPuzzle 的
// loadPrefs、任何一个游戏文件里的 Prefer 常量或 prefs.seed,或者升级 vendor/ 之后跑。
// 守五条:
//   一、认控件只能按英文 label(emcc 只把 name 交给 JS,kw 到不了这一侧)。上游改了
//       那句话,键会「消失」而不是「按下去没反应」——下面逐个游戏点名断言它还在。
//   二、按一下真的写进了上游的偏好存档,不是只把键面点亮(Solo 走完整一圈)。
//   三、多个键时按上游 get_prefs 的先后排,而不是游戏文件里的书写序。
//   四、多选一的键一按走下一格、走到头绕回,且脸跟着换。
//   五、下游种的默认值(prefs.seed)开局到位,且压不过用户自己存过的那一条。
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

console.log('\n下游种的默认值')
// games/util/declare.ts 的 keepPencil:五个数独族游戏把 pencil-keep-highlight 翻成 true。
for (const game of ['Solo', 'Unequal', 'Keen', 'Towers', 'Undead']) {
  await open(page, game, { clear: [`puzzles.prefs.${game.toLowerCase()}`] })
  if ((await keys.first().getAttribute('data-on')) === 'true') ok(`${game} 开局就是亮的`)
  else fail(`${game} 开局该亮不亮——种子没到位`)
}
// 存档压过种子:两者都在时,逐行赋值后写的赢,所以用户存的那一条说了算。
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate((k) => localStorage.setItem(k, 'pencil-keep-highlight=false\n'), PREFS)
await open(page, 'Solo', { clear: [] })
if ((await keys.first().getAttribute('data-on')) === null) ok('存档里明写 false,种子让位')
else fail('存档没压过种子')

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

// 偏好面板和键区读的必须是同一个真值。
await page.getByRole('button', { name: /Menu/i }).first().click()
await page.waitForTimeout(400)
const row = await page.evaluate(() =>
  [...document.querySelectorAll('.sheet-prefs input[type=checkbox]')]
    .map((b) => [b.closest('label')?.textContent ?? '', b.checked])
    .find(([text]) => /pencil mark/i.test(text)) ?? null,
)
if (row?.[1] === true) ok('偏好面板里同一条也是勾上的')
else fail('偏好面板和键区对不上:', JSON.stringify(row))

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
