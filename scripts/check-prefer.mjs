//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-prefer.mjs
//
// 改了 games/util/keys.ts 的 preferKeys、useConfigBox 的 borrowPrefs、任何一个
// 游戏文件里的 Prefer 常量,或者升级 vendor/ 之后跑。守三条:
//   一、认控件只能按英文 label(emcc 只把 name 交给 JS,kw 到不了这一侧)。上游改了
//       那句话,键会「消失」而不是「按下去没反应」——下面逐个游戏点名断言它还在。
//   二、按一下真的写进了上游的偏好存档,不是只把键面点亮(Solo 走完整一圈)。
//   三、多个键时按上游 get_prefs 的先后排,而不是游戏文件里的书写序。
import { boot, open, URL_BASE } from './lib/boot.mjs'

// 每个游戏该有几个 prefer 键。数目对不上就是某条 label 没认出来。
const EXPECT = [
  ['Solo', 1], ['Keen', 1], ['Towers', 1], ['Unequal', 1], ['Undead', 1],
  ['Guess', 1], ['Map', 1], ['Bridges', 1], ['Singles', 1],
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

console.log('\nSolo 走完整一圈')
await open(page, 'Solo', { clear: [PREFS, 'puzzles.save.solo'] })
const key = keys.first()
const lit = () => key.getAttribute('data-on')
const saved = () => page.evaluate((k) => localStorage.getItem(k), PREFS)

if ((await lit()) === null) ok('初始是灭的(上游默认 false)')
else fail('初始应当是灭的')

await key.click()
await page.waitForTimeout(200)
if ((await lit()) === 'true') ok('按一下:键面亮了')
else fail('按一下之后键面没亮')
if (new RegExp(`${KW}=true`).test((await saved()) ?? '')) ok(`存档里 ${KW}=true`)
else fail('存档没写成 true:', await saved())

await key.click()
await page.waitForTimeout(200)
if ((await lit()) === null) ok('再按一下:灭了')
else fail('再按之后没灭')
if (new RegExp(`${KW}=false`).test((await saved()) ?? '')) ok(`存档里 ${KW}=false`)
else fail('存档没写回 false:', await saved())

// 偏好面板和键区读的必须是同一个真值。
await key.click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: /Menu/i }).first().click()
await page.waitForTimeout(400)
const row = await page.evaluate(() =>
  [...document.querySelectorAll('.sheet-prefs input[type=checkbox]')]
    .map((b) => [b.closest('label')?.textContent ?? '', b.checked])
    .find(([text]) => /pencil mark/i.test(text)) ?? null,
)
if (row?.[1] === true) ok('偏好面板里同一条也是勾上的')
else fail('偏好面板和键区对不上:', JSON.stringify(row))

await browser.close()
console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
