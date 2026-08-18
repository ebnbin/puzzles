// 键盘不认焦点:走完一圈会抢焦点的操作,物理键盘每一步都还到得了引擎。
// 守的是 usePuzzleKeys 的判据——改动那里、给谜题页加会抢焦点的部件、或者动
// Manual 那句 capture + stopPropagation 之后必跑。
//
//   npm run build && npx vite preview --port 4173 &
//   npm i --no-save playwright && node scripts/check-focus.mjs
//
// 判据是「api.key 被调到了没有」,不是画面:上方键区和方向键块走的是 board.send,
// 从不经过 DOM 焦点,只有物理键盘会被焦点卡住。
import { boot, open } from './lib/boot.mjs'

const GAME = 'Solo'

let failures = 0

// apiRef.current 和 window.__puzzle 是同一个对象,包住 key 就数得到每一次转发。
// 换游戏会换实例,每次重进都要重包一次。
const countKeys = (page) =>
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

async function press(page, key) {
  await page.evaluate(() => {
    window.__hits = 0
  })
  await page.keyboard.press(key)
  await page.waitForTimeout(80)
  return page.evaluate(() => ({
    hits: window.__hits,
    at:
      document.activeElement === document.body
        ? 'body'
        : document.activeElement?.className ||
          document.activeElement?.tagName ||
          'null',
  }))
}

async function check(page, want, label, act, key = 'ArrowRight') {
  try {
    if (act) await act()
  } catch (error) {
    failures++
    console.log(` FAIL  ${label.padEnd(26)} 操作没做成: ${error.message.split('\n').slice(0, 8).join(' | ')}`)
    return
  }
  const { hits, at } = await press(page, key)
  const ok = want === 'alive' ? hits > 0 : hits === 0
  if (!ok) failures++
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(26)} focus=${at}`)
}

const alive = (page, label, act, key) => check(page, 'alive', label, act, key)
const deaf = (page, label, act, key) => check(page, 'deaf', label, act, key)

const named = (page, name) => page.getByRole('button', { name })

// 撤销键要走过一步棋才活。Solo 的既有数字格拒填,所以沿着一行往右挪着试。
async function playOneMove(page) {
  const undo = named(page, 'Undo')
  for (let i = 0; i < 12; i++) {
    if (await undo.isEnabled()) return
    await page.keyboard.press('1')
    await page.waitForTimeout(60)
    if (await undo.isEnabled()) return
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(40)
  }
  throw new Error('走不出一步棋,撤销键始终是灰的')
}

const { browser, page } = await boot({ viewport: { width: 1100, height: 900 } })
await open(page, GAME)
await countKeys(page)

console.log(`\n${GAME} —— 键盘该活的地方`)
await alive(page, '刚从画廊点进来')
await alive(page, '关掉开局介绍浮层', async () => {
  const x = page.locator('.notice-intro button')
  if (await x.count()) await x.click()
  await page.waitForTimeout(150)
})
await alive(page, '点过棋盘', async () => {
  await page.locator('.puzzle-canvas').click({ position: { x: 60, y: 60 } })
  await page.waitForTimeout(150)
})
await alive(page, '按过上方键区', async () => {
  await page.locator('.keypad button').first().click()
  await page.waitForTimeout(150)
})
await alive(page, '按过方向键块', async () => {
  await page.locator('.puzzle-arrows button:not([disabled])').first().click()
  await page.waitForTimeout(150)
})
await alive(page, '按过撤销', async () => {
  await playOneMove(page)
  await named(page, 'Undo').click()
  await page.waitForTimeout(150)
})
await alive(page, '按过主题切换', async () => {
  await page.locator('.puzzle-bar .puzzle-icon').first().click()
  await page.waitForTimeout(200)
})
await alive(page, '玩法 dialog 开→关', async () => {
  await named(page, 'How to play').click()
  await page.waitForTimeout(250)
  await page.locator('.dialog-close').click()
  await page.waitForTimeout(250)
})
await alive(page, '菜单 开→Escape 关', async () => {
  await page.locator('.puzzle-acts button.is-menu').click()
  await page.waitForTimeout(250)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
})
await alive(page, '类型 开→Escape 关', async () => {
  await named(page, 'Type').click()
  await page.waitForTimeout(250)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
})
await alive(page, '按过 Tab', async () => {
  await page.keyboard.press('Tab')
  await page.waitForTimeout(100)
})
await alive(page, '回画廊再进一个游戏', async () => {
  await page.locator('.puzzle-title').click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^Net/ }).first().click()
  await page.waitForFunction(() => !!window.__puzzle, null, { timeout: 20000 })
  await page.waitForTimeout(400)
  await countKeys(page)
})

console.log('\n覆盖层盖着的时候要让路')
await deaf(page, '菜单开着', async () => {
  await page.locator('.puzzle-acts button.is-menu').click()
  await page.waitForTimeout(300)
  // 焦点归还只许发生在覆盖层全关上的那一刻:sheet 开着时把焦点抢到盖住的棋盘上,
  // 等于把焦点扔到 aria-modal 外面(closeTypes 里带 focus() 时踩过)。
  const stolen = await page.evaluate(
    () => document.activeElement?.className === 'puzzle-canvas',
  )
  if (stolen) throw new Error('sheet 开着,焦点却被抢到盖住的棋盘上')
})
await alive(page, '菜单关掉之后', async () => {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})
await deaf(page, '手册开着', async () => {
  await named(page, 'How to play').click()
  await page.waitForTimeout(300)
  await page.locator('.prose-more a').click()
  await page.waitForTimeout(800)
})
await alive(page, '手册关掉之后', async () => {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
})

const say = (ok, label, why = '') => {
  if (!ok) failures++
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${why && !ok ? ` —— ${why}` : ''}`)
}

// 焦点停在按钮上时的分工:Space / Enter 归按钮(它们只对按钮有意义),别的键归谜题。
console.log('\n焦点在按钮上:Space / Enter 归按钮,其余归谜题')
await page.locator('.puzzle-acts button.is-menu').focus()
const space = await press(page, ' ')
say(space.hits === 0, 'Space 没漏给谜题')
say((await page.locator('.sheet').count()) > 0, 'Space 把菜单按开了')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.locator('.puzzle-acts button.is-menu').focus()
say((await press(page, 'ArrowRight')).hits > 0, '方向键照旧归谜题')

console.log('\n修饰键的分界')
await page.evaluate(() => {
  document.querySelector('.puzzle-canvas').focus()
  window.__eaten = null
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' && e.ctrlKey) window.__eaten = e.defaultPrevented
  })
})
// Ctrl + 单字符全是浏览器的地盘:上游会认领 Ctrl+R 并 preventDefault,刷新就没了。
const ctrlR = await press(page, 'Control+r')
say(ctrlR.hits === 0, 'Ctrl+R 没转给谜题')
say(
  (await page.evaluate(() => window.__eaten)) === false,
  'Ctrl+R 没被 preventDefault',
  '刷新会失灵',
)
// Ctrl + 方向浏览器不要,留给谜题(net 靠它移信号源)。
say((await press(page, 'Control+ArrowRight')).hits > 0, 'Ctrl+方向仍归谜题')

await browser.close()
console.log(failures === 0 ? '\n全绿' : `\n${failures} 处不对`)
process.exit(failures === 0 ? 0 : 1)
