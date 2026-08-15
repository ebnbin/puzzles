//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-keys.mjs
//
// 六个游戏由上游实现 request_keys();其余游戏的键全是我们自己加的,上游答空数组,
// 这里只断言「空」,不断言键面。
import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'

const UPSTREAM = ['Solo', 'Keen', 'Towers', 'Unequal', 'Filling', 'Undead']
const OURS = ['Net', 'Guess', 'Map', 'Galaxies', 'Fifteen']

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }

// 走首页点进去,不直接访问 /<game>:那条路由是客户端的,vite preview 会 404。
async function open(game, shown) {
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('puzzles.arrows', 'true')
    localStorage.removeItem('puzzles.playing')
  })
  await page.goto(URL_BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(`^${shown}`) }).first().click()
  await page.waitForFunction(() => !!window.__puzzle, null, { timeout: 20000 })
  await page.waitForTimeout(400)
}

// 引擎侧的答案:{button, label}[]。旧引擎没有这个洞,整份跳过而不是当成空。
const ask = () =>
  page.evaluate(() => (window.__puzzle.requestKeys ? window.__puzzle.requestKeys() : null))

// 键面上的 button 码。我们自己加的键 button 一律是 0,不参与比对。
const rendered = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.keypad button')]
      .map((b) => Number(b.getAttribute('data-button')))
      .filter((n) => n !== 0),
  )

const shownAs = (button) =>
  button === 8 ? 'Backspace' : JSON.stringify(String.fromCharCode(button))

for (const game of UPSTREAM) {
  await open(game, game)
  const keys = await ask()
  if (keys === null) {
    console.log('  skip ', game, '(引擎里没有 requestKeys,是旧产物)')
    continue
  }
  if (!keys.length) {
    fail(game, '上游应当报出符号键,却是空的')
    continue
  }
  const mine = new Set(await rendered())
  for (const { button } of keys)
    if (!mine.has(button)) fail(game, `上游要 ${shownAs(button)},键面上没有`)
  console.log('  ok  ', game, `上游报 ${keys.length} 个键,键面都有`)
}

for (const game of OURS) {
  await open(game, game)
  const keys = await ask()
  if (keys === null) continue
  if (keys.length) fail(game, `上游不该报键,却报了 ${keys.length} 个`)
  else console.log('  ok  ', game, '上游不报键(键面上的都是我们自己加的)')
}

await browser.close()
console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
