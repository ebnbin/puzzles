import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import {
  CHROMIUM,
  cornerColour,
  dealIconPosition,
  freshDir,
  games,
  openBoard,
  outFile,
  readRedos,
  root,
  savePath,
  square,
  THEMES,
} from './lib/pictures.mjs'

const outDir = path.join(root, 'public/howto')
const SIZE = 324

// 这三个的 Solve 只展示答案不改盘(flood 存的是 solution path),必须直接用
// 发牌图,否则玩法图变成「画着答案路线的未完成盘」;cube/samegame/pegs 的
// can_solve=false 由「solve 前后像素相同即回退」自动兜住,不用列在这里。
const SOLVE_ONLY_SHOWS = new Set(['flood', 'inertia', 'flip'])

const board = (page) =>
  page.evaluate(() => document.querySelector('.host-board').toDataURL())

const only = process.argv.slice(2)
const list = games().filter((g) => !only.length || only.includes(g.name))
const redos = readRedos()

const browser = await chromium.launch({ executablePath: CHROMIUM })
if (only.length) fs.mkdirSync(outDir, { recursive: true })
else freshDir(outDir)

const how = {}
let failed = 0
let wrote = 0

for (const game of list) {
  if (!fs.existsSync(savePath(game.name))) {
    console.error(`  ${game.name.padEnd(10)} no saved position upstream`)
    failed++
    continue
  }

  for (const theme of THEMES) {
    const { context, page, errors } = await openBoard(browser, { game: game.name, theme })
    try {
      let note
      if (SOLVE_ONLY_SHOWS.has(game.name)) {
        await dealIconPosition(page, { game: game.name, redos })
        note = 'as dealt (shown only)'
      } else {
        await page.evaluate(
          (text) => window.__puzzle.loadGame(text),
          fs.readFileSync(savePath(game.name), 'utf8'),
        )
        await page.waitForTimeout(400)
        // 取开局必须 loadGame(上游 .sav)后 restart():restart 保留生成时的 aux,
        // netslide/untangle 没有 aux 会拒绝 solve;改成按 game id 重发,aux 就丢了。
        await page.evaluate(() => window.__puzzle.restart())
        await page.waitForTimeout(300)

        const before = await board(page)
        await page.evaluate(() => window.__puzzle.solve())
        await page.waitForFunction(() => !window.__animating, null, { timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(300)

        if ((await board(page)) === before) {
          await dealIconPosition(page, { game: game.name, redos })
          note = 'as dealt (no solver)'
        } else {
          note = 'solved'
        }
      }

      const shot = await page.locator('.host-board').screenshot()
      const pad = await cornerColour(page)
      fs.writeFileSync(
        outFile(outDir, game.name, theme),
        await square(page, shot, { size: SIZE, pad }),
      )
      wrote++

      if (theme === 'light') {
        how[game.name] = note
        const size = await page.evaluate(() => {
          const c = document.querySelector('.host-board')
          return `${c.width}x${c.height}`
        })
        console.log(`  ${game.name.padEnd(10)} ${size.padEnd(9)} ${note}`)
      }
      if (errors.length) throw new Error(errors[0])
    } catch (error) {
      console.error(`  ${game.name.padEnd(10)} ${theme}: FAILED: ${error.message}`)
      failed++
    }
    await context.close()
  }
}

await browser.close()

if (Object.keys(how).length) {
  const file = path.join(outDir, 'how.json')
  const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const merged = Object.fromEntries(
    games()
      .map((g) => [g.name, how[g.name] ?? kept[g.name]])
      .filter(([, v]) => v),
  )
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`)
}

console.log(`\nwrote ${wrote} pictures to public/howto`)
if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
