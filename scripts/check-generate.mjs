// 出题走 worker 的契约测试。改了 engine/puzzle-lib.js、src/engine/nullHost.ts、
// generator.worker.ts、或 PuzzleHost 里任何一条出题路径,都要跑一遍:
//
//   npm run build && npm exec -- vite preview --port 4173 --strictPort &
//   npm i --no-save playwright && node scripts/check-generate.mjs
//
// 为什么要四十个游戏全跑:nullHost 的空渲染器得覆盖 C 会调的每一个 PZ.draw.*,
// 缺一个只在「恰好画那个东西」的游戏上炸。net 不画字,所以少了 fontMidpoint 也
// 一路绿灯;pattern 会当场 TypeError。单个游戏的通过说明不了任何事。
//
// 不比对新旧 desc:Pegs 的 Cross 盘是确定性的,重开一局出来的 desc 一模一样,
// 那不是失败。真正要问的是「worker 起过、没报错、闸抬回去了、局还活着」。
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const GAMES = JSON.parse(readFileSync(new URL('../src/games.json', import.meta.url)))

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)

let bad = 0
const fail = (...m) => { bad++; console.log('  FAIL', ...m) }
const ok = (...m) => console.log('  ok  ', ...m)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(page, name, { introduced = true } = {}) {
  await page.addInitScript(
    ({ game, seen }) => {
      localStorage.setItem('puzzles.playing', '1')
      localStorage.setItem('puzzles.recent', game)
      if (seen) localStorage.setItem('puzzles.introduced', JSON.stringify([game]))
      else localStorage.removeItem('puzzles.introduced')
      localStorage.removeItem(`puzzles.save.${game}`)
    },
    { game: name, seen: introduced },
  )
  await page.goto(URL_BASE)
  await page.waitForSelector('.play[data-ready="true"]', { timeout: 30000 })
  await page.waitForFunction(() => !!window.__puzzle, null, { timeout: 30000 })
}

async function waitForWorker(count, was, ms = 30000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (count() > was) return true
    await sleep(25)
  }
  return false
}

console.log('四十个游戏各走一次「菜单 → 新游戏」')
for (const { name } of GAMES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const crashes = []
  page.on('pageerror', (e) => crashes.push(e.message))
  let workers = 0
  page.on('worker', () => workers++)

  try {
    await open(page, name)
    const was = workers

    await page.click('button.is-menu')
    await page.click('.sheet-actions button.is-primary')

    const spawned = await waitForWorker(() => workers, was)
    await page.waitForSelector('.play-wait', { state: 'detached', timeout: 30000 })
    const alive = await page.evaluate(() =>
      /^PARAMS *:/m.test(window.__puzzle.saveGame()),
    )
    const shown = await page.locator('p.notice-error').count()

    if (crashes.length) fail(name, '页面抛错:', crashes[0])
    else if (!spawned) fail(name, '没起 worker——出题还在主线程上')
    else if (shown) fail(name, '出题后冒出了错误提示')
    else if (!alive) fail(name, '出完题局面是坏的')
    else ok(name)
  } catch (error) {
    fail(name, String(error).split('\n')[0])
  } finally {
    await page.close()
  }
}

// 参数不合法时:错误落在参数面板里,面板留在原地等人改,不能把局面换掉。
console.log('非法参数')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const crashes = []
  page.on('pageerror', (e) => crashes.push(e.message))
  try {
    await open(page, 'net')
    const before = await page.evaluate(() => window.__puzzle.saveGame())

    await page.click('.play-acts button[aria-haspopup="dialog"]:not(.is-menu)')
    await page.click('.sheet-preset-custom input')
    const width = page.locator('.sheet-custom .dialog-string input').first()
    await width.fill('0')
    await width.press('Enter')

    await page.waitForSelector('.sheet-custom p.notice-error', { timeout: 20000 })
    await page.waitForSelector('.play-wait', { state: 'detached', timeout: 20000 })
    const still = await page.locator('.sheet-custom').count()
    const same = (await page.evaluate(() => window.__puzzle.saveGame())) === before

    if (crashes.length) fail('非法参数页面抛错:', crashes[0])
    else if (!still) fail('报错之后参数面板被关掉了')
    else if (!same) fail('参数不合法却把局面换了')
    else ok('参数不合法:面板留着报错,局面没动')
  } catch (error) {
    fail('非法参数', String(error).split('\n')[0])
  } finally {
    await page.close()
  }
}

// 出题期间的按键状态。选 Solo:它既有数字键,5x6 又慢得够看清中间态。
console.log('出题期间谁该按不动')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('pageerror', (e) => fail('按键状态页面抛错:', e.message))
  try {
    // 不标 introduced,让开场介绍条露出来
    await open(page, 'solo', { introduced: false })
    await page.waitForSelector('p.notice-intro', { timeout: 20000 })

    await page.click('.play-acts button[aria-haspopup="dialog"]:not(.is-menu)')
    await page.click('.sheet-preset-custom input')
    const fields = page.locator('.sheet-custom .dialog-string input')
    await fields.nth(0).fill('5')
    await fields.nth(0).press('Enter')
    await fields.nth(1).fill('6')
    await fields.nth(1).press('Enter')
    await page.keyboard.press('Escape')

    await page.waitForSelector('.play-wait', { timeout: 20000 })
    const state = await page.evaluate(() => {
      const off = (sel) =>
        [...document.querySelectorAll(sel)].every((b) => b.disabled)
      const on = (sel) =>
        [...document.querySelectorAll(sel)].every((b) => !b.disabled)
      const acts = '.play-acts button'
      // 介绍条不该被浮层盖住:量它正中间那一点,顶上的必须还是它自己。
      const intro = document.querySelector('p.notice-intro')
      const box = intro?.getBoundingClientRect()
      const top = box
        ? document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        : null
      return {
        keypad: off('.keypad button'),
        arrows: off('.play-arrows button'),
        undoRedo: off(`${acts}:not([aria-haspopup]):not(.is-menu)`),
        types: on(`${acts}[aria-haspopup="dialog"]:not(.is-menu)`),
        menu: on(`${acts}.is-menu`),
        introOnTop: !!intro && !!top && intro.contains(top),
        hadKeypad: document.querySelectorAll('.keypad button').length > 0,
      }
    })

    if (!state.hadKeypad) fail('Solo 居然没有数字键,这条断言白写了')
    else if (!state.keypad) fail('出题期间数字键还能按')
    else if (!state.arrows) fail('出题期间方向键还能按')
    else if (!state.undoRedo) fail('出题期间撤销/重做还能按')
    else if (!state.types) fail('出题期间「类型」被按死了,玩家改不了主意')
    else if (!state.menu) fail('出题期间「菜单」被按死了,玩家改不了主意')
    else if (!state.introOnTop) fail('loading 浮层盖住了开场介绍条')
    else ok('数字键/方向键/撤销重做按不动,类型和菜单照常,介绍条没被盖住')
  } catch (error) {
    fail('按键状态', String(error).split('\n')[0])
  } finally {
    await page.close()
  }
}

// 出题还在飞的时候玩家把参数面板关掉:落地时不能再去 dialogCancel 一次
// (cfg 已经被 free_cfg 回收了,二次释放 = wasm abort),局面照样要换。
console.log('出题途中关掉参数面板')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const crashes = []
  page.on('pageerror', (e) => crashes.push(e.message))
  try {
    await open(page, 'net')
    await page.click('.play-acts button[aria-haspopup="dialog"]:not(.is-menu)')
    await page.click('.sheet-preset-custom input')
    const width = page.locator('.sheet-custom .dialog-string input').first()
    await width.fill('120')
    await width.press('Enter')
    // 趁 120 宽那局还在出,把整个类型面板关掉
    await page.waitForSelector('.play-wait', { timeout: 20000 })
    await page.keyboard.press('Escape')

    await page.waitForFunction(
      () => /^PARAMS *:\d+:120x/m.test(window.__puzzle.saveGame()),
      null,
      { timeout: 40000 },
    )
    await page.waitForSelector('.play-wait', { state: 'detached', timeout: 20000 })
    const alive = await page.evaluate(() => /^PARAMS *:/m.test(window.__puzzle.saveGame()))

    if (crashes.length) fail('关面板后抛错:', crashes[0])
    else if (!alive) fail('关面板后局面是坏的')
    else ok('出题途中关面板:照常落地,没有二次释放')
  } catch (error) {
    fail('关面板', String(error).split('\n')[0])
  } finally {
    await page.close()
  }
}

// 偏好不出题(emcc.c 的 cfg_end 对 CFG_PREFS 走的是不动棋盘那一支),所以它
// 必须留在主线程:起了 worker 就说明有人把它错接到出题路径上了。
console.log('偏好设置不该起 worker')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('pageerror', (e) => fail('偏好页面抛错:', e.message))
  try {
    await open(page, 'net')
    await page.click('button.is-menu')
    const box = page.locator('.sheet .dialog-boolean input').first()
    await box.waitFor({ timeout: 20000 })
    let workers = 0
    page.on('worker', () => workers++)
    await box.click()
    await sleep(1200)
    if (workers) fail(`改偏好起了 ${workers} 个 worker`)
    else ok('改偏好没起 worker')
  } catch (error) {
    fail('偏好', String(error).split('\n')[0])
  } finally {
    await page.close()
  }
}

// 慢局:出题期间主线程必须还在画帧。net 120x120 在 wasm 里要 0.5~2 秒,
// 同步时代这段时间整个页面是冻住的。
// 这一段同时验了「接班」:填完宽就起了一次出题,填高时把它顶掉,最后落地的
// 必须是 120x120 那一局。
console.log('慢局(net 120x120)出题时的主线程掉帧')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const crashes = []
  page.on('pageerror', (e) => crashes.push(e.message))
  try {
    await open(page, 'net')
    // 只统计 loading 浮层挂着的那段。落地后主线程要把 14400 个格子画一遍,那一帧
    // 一百到四百毫秒不等——但它是「画大棋盘」的固有成本,同步时代也一样付,
    // 混进来只会让这条断言变成扔骰子。
    await page.evaluate(() => {
      const probe = { worst: 0, ticks: 0, last: performance.now(), on: true }
      window.__probe = probe
      const tick = (now) => {
        if (!probe.on) return
        const gap = now - probe.last
        probe.last = now
        if (document.querySelector('.play-wait')) {
          probe.worst = Math.max(probe.worst, gap)
          probe.ticks++
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    await page.click('.play-acts button[aria-haspopup="dialog"]:not(.is-menu)')
    await page.click('.sheet-preset-custom input')
    const fields = page.locator('.sheet-custom .dialog-string input')
    // 宽、高各填 120。text 只在 blur/Enter 落定,所以每格都按一次 Enter。
    for (const i of [0, 1]) {
      await fields.nth(i).fill('120')
      await fields.nth(i).press('Enter')
    }

    await page.waitForFunction(
      () => /^PARAMS *:\d+:120x120/m.test(window.__puzzle.saveGame()),
      null,
      { timeout: 40000 },
    )
    const probe = await page.evaluate(() => {
      window.__probe.on = false
      return { worst: Math.round(window.__probe.worst), ticks: window.__probe.ticks }
    })

    if (crashes.length) fail('慢局页面抛错:', crashes[0])
    // 帧数才是「没冻住」的正面证据:主线程要是被占着,一帧都画不出来。
    else if (probe.ticks < 5) fail(`出题期间只画了 ${probe.ticks} 帧,主线程被占住了`)
    else if (probe.worst > 250) fail(`出题期间主线程卡了 ${probe.worst}ms`)
    else ok(`net 120x120 出题期间画了 ${probe.ticks} 帧,最大掉帧 ${probe.worst}ms`)
  } catch (error) {
    fail('慢局', String(error).split('\n')[0])
  } finally {
    await page.close()
  }
}

await browser.close()
console.log(bad ? `\n${bad} 处不对` : '\nall good')
process.exit(bad ? 1 : 0)
