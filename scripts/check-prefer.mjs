//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-prefer.mjs
//
// 改了 games/util/keys.ts 的 preferKey / pencilKey、useConfigBox 的 borrowPrefs,
// 或者升级 vendor/ 之后跑。守的是 prefer 这一类的两条命脉:
//   一、认控件只能按英文 label(emcc 只把 name 交给 JS,kw 到不了这一侧)。上游改了
//       那句话,键会「消失」而不是「按下去没反应」——这里断言它现在还在。
//   二、按一下真的写进了上游的偏好存档,不是只把键面点亮。
import { boot, open, URL_BASE } from './lib/boot.mjs'

const PREFS = 'puzzles.prefs.solo'
const KW = 'pencil-keep-highlight'

const { browser, page } = await boot()

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }
const ok = (...m) => console.log('  ok  ', ...m)

// open() 只管 arrows,别的开关得自己先摆好——它不会替我们清掉。
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('puzzles.prefer', 'true'))
await open(page, 'Solo', { clear: [PREFS, 'puzzles.save.solo'] })

const key = page.locator(".keypad button[data-kind='prefer']")
const lit = () => key.getAttribute('data-on')
const saved = () => page.evaluate((k) => localStorage.getItem(k), PREFS)

const count = await key.count()
if (count !== 1) {
  fail(`Solo 应当只有一个 prefer 键,数到 ${count} 个`)
  console.log(`\n${bad} failed`)
  await browser.close()
  process.exit(1)
}
ok('Solo 的 prefer 键在')

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
