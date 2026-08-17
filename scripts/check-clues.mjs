import { boot, open } from './lib/boot.mjs'

const ROWS = Number(process.env.ROWS ?? 8)

const { browser, page } = await boot({ touch: true })
await open(page, 'Map', { clear: ['puzzles.save.map'], settle: 1300 })

const size = await page.evaluate(() => {
  const api = window.__puzzle
  const parse = (save) => {
    const lines = []
    for (let at = 0; at < save.length; ) {
      const key = save.slice(at, at + 8).trimEnd()
      const colon = save.indexOf(':', at + 9)
      const len = Number(save.slice(at + 9, colon))
      lines.push({ key, value: save.slice(colon + 1, colon + 1 + len) })
      at = colon + 1 + len + 1
    }
    return lines
  }
  const lines = parse(api.saveGame())
  const field = (k) => lines.find((f) => f.key === k)?.value
  const [w, h, n] = field('PARAMS').match(/^(\d+)x(\d+)n(\d+)/).slice(1).map(Number)
  const move = Array.from({ length: n }, (_, r) => `0:${r}`).join(';')
  const wr = (k, v) => `${k.padEnd(8)}:${v.length}:${v}\n`
  const head = lines.findIndex((f) => f.key === 'NSTATES')
  api.loadGame(
    lines.slice(0, head).map((f) => wr(f.key, f.value)).join('') +
      wr('NSTATES', '2') + wr('STATEPOS', '2') + wr('MOVE', move),
  )
  return { w, h, n }
})

const arrow = async (d) => {
  await page.locator(`.play-arrows button[aria-label="${d}"]`).click()
  await page.waitForTimeout(40)
}
// map 的颜色键是上方区域里那排圆的(pick 类,见 src/games/map.ts):第一个灰着
// 就是我们认为光标站在线索上。按类别找、不按名字,名字会跟着「可能」模式换。
const ours = () =>
  page.evaluate(() => document.querySelector(".keypad [data-kind='pick']").disabled)
const theirs = () => page.evaluate(() => {
  const api = window.__puzzle
  // 读 STATEPOS、不数 MOVE 行:序列化含被 undo 的走子,数行曾让这个检查认可过
  // 一个坏 reader。
  const pos = (s) => Number(/^STATEPOS\s*:\d+:(\d+)/m.exec(s)?.[1] ?? -1)
  const before = pos(api.saveGame())
  api.key(0, 'Enter', '', 0, 0, 0)
  api.key(0, 'Enter', '', 0, 0, 0)
  const emptied = pos(api.saveGame()) > before
  if (emptied) api.undo()
  return !emptied
})

let bad = 0
let tried = 0
let clues = 0
const check = async (where) => {
  const mine = await ours()
  const engine = await theirs()
  tried++
  if (engine) clues++
  if (mine !== engine) {
    bad++
    if (bad <= 10)
      console.log(`  ✗ ${where}: 我们说${mine ? '不能填' : '能填'}，引擎说${engine ? '不能填' : '能填'}`)
  }
}

console.log(`棋盘 ${size.w}×${size.h}，${size.n} 个区域，已全部上色`)
await arrow('Right')
for (let row = 0; row < ROWS; row++) {
  for (let i = 0; i < size.w - 6; i++) {
    await arrow(row % 2 ? 'Left' : 'Right')
    await check(`第 ${row} 行`)
  }
  await arrow('Down')
  await check(`往下到第 ${row + 1} 行`)
}
for (let i = 0; i < ROWS; i++) {
  await arrow('Up')
  await check('往上走')
}

console.log(`\n${tried} 格，引擎判为线索 ${clues} 格，不一致 ${bad} 格`)
await browser.close()
process.exit(bad ? 1 : 0)
