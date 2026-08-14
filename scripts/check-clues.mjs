/*
 * Does Map's palette go out exactly where a colour cannot land?
 *
 * The companion to check-map.mjs. That one asks whether a swatch paints the
 * region the cursor is on; this one asks whether the swatches are *offered*
 * only where painting is possible — a clue region cannot be recoloured, and a
 * live button over one is a press that does nothing.
 *
 * src/engine/map.ts answers it by reading one redraw of the dealt position:
 * at the deal, "this region is coloured" and "this region is a clue" are the
 * same fact (map.c:1896-1897), so the board's own drawing is the table. What
 * can go wrong is the reading — the tile size taken from the shapes, the
 * triangles that mark diagonally divided squares, and the quadrant the cursor
 * stands in, which depends on the arrow that took it there (map.c:2455).
 *
 * So this asks the engine instead, and asks it in a way that shares nothing
 * with the drawing: give every region a colour, then at each cell press select
 * twice, which is upstream's own "empty this region". A region that takes it
 * writes a move; a clue writes nothing at all (map.c:2588). Undo after each
 * success so the board stays coloured and every cell is asked the same
 * question.
 *
 * The walk is a snake plus a column back up, so cells are arrived at from all
 * four directions and the quadrant arithmetic is exercised rather than assumed.
 *
 * Worth running after upgrading vendor/sgtpuzzles, and after touching
 * engine/map's clue reading, CanvasRenderer's recording, or Map's entry in
 * engine/keys.
 *
 * Needs a preview server and playwright, like the other scripts outside
 * package.json:
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/check-clues.mjs
 */
import { chromium } from 'playwright'

const URL_BASE = process.env.PREVIEW ?? 'http://localhost:4173'
const ROWS = Number(process.env.ROWS ?? 8)

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))
await page.goto(URL_BASE)
await page.evaluate(() => {
  localStorage.setItem('puzzles.arrows', 'true')
  localStorage.removeItem('puzzles.playing')
  localStorage.removeItem('puzzles.save.map')
})
await page.goto(URL_BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Map/ }).first().click()
await page.waitForFunction(() => !!window.__puzzle)
await page.waitForTimeout(1300)

/*
 * Colour every region, so that "empty this region" always has something to do
 * except where upstream refuses. A move names a region by number and the
 * numbers run 0 to n-1, so writing this needs no geometry — the one thing
 * about a Map board that can be said without knowing its shape.
 */
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
/** What we say: the palette is out. */
const ours = () => page.evaluate(() => document.querySelector('.keypad button').disabled)
/** What the engine says, by refusing to empty the region under the cursor. */
const theirs = () => page.evaluate(() => {
  const api = window.__puzzle
  /*
   * STATEPOS, not the number of MOVE lines. An undo leaves its line behind in
   * the redo tail and the next move purges it and writes one of its own, so the
   * count comes out unchanged and every cell after the first would read as
   * refused. That mistake made this test agree with a broken reader.
   */
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
