// 六个契约测试(check-*.mjs)共用的开机礼:起浏览器、从首页点进一个游戏、
// 等引擎活过来。何时跑、守什么,钉在各被测文件的头部注释里。
// 环境变量:PREVIEW 换地址,CHROME 指定浏览器可执行文件。
import { chromium } from 'playwright'

export const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'

export async function boot({ touch = false, viewport = { width: 390, height: 844 } } = {}) {
  const browser = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {},
  )
  const page = await browser.newPage({ viewport, hasTouch: touch })
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message))
  return { browser, page }
}

// 走首页点进去,不直接访问 /<game>:那条路由是客户端的,vite preview 会 404。
// arrows 默认打开(测的多半是方向键块);check-solved 例外地关着:它不用
// 方向键,而且按文档序在 role=group 里数按钮,开了就多出一个 group。
export async function open(
  page,
  shown,
  { arrows = true, clear = [], settle = 400 } = {},
) {
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ arrows, clear }) => {
      if (arrows) localStorage.setItem('puzzles.arrows', 'true')
      localStorage.removeItem('puzzles.playing')
      for (const key of clear) localStorage.removeItem(key)
    },
    { arrows, clear },
  )
  await page.goto(URL_BASE, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(`^${shown}`) }).first().click()
  await page.waitForFunction(() => !!window.__puzzle, null, { timeout: 20000 })
  await page.waitForTimeout(settle)
}
