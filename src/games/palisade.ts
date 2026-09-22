// Palisade:切成等大块。上游 palisade.c。current_key_label 注册 NULL:两个键的死活从每一帧画面里
// 读,光标框的形状说明脚下能不能画墙,框底边的颜色说明那里是墙、「没有墙」还是空(palisade.c:1228);
// 改这里跑 scripts/check-palisade.mjs。对方记号上一按替换(先擦后画,两条走子);Full-grid 光标
// 模式下这两个键改当上膛键,键面读偏好,但不 volatile:它的偏好没有棋盘输入能翻。
import type { ArrowKey, Game, Mods, Slot, View } from './game'
import type { Custom } from './util/custom'
import { AREA_MAX, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Drawn } from '../engine/renderer'
import type { Prefer } from './util/keys'
import { preference, preferKeys } from './util/keys'
import { optionAt } from './util/upstream'
import { cross } from './util/pad'

const WALL = 2
const MAYBE = 3
const NO = 4
// 颜色编号照 palisade.c:1162-1173 的 enum 顺序;ERROR(5)是「破坏了线索的墙」,语义仍是墙,
// 必须留在过滤名单里并归入 'wall'。
const ERROR = 5

export type Border = 'wall' | 'no' | 'none'

export type Stand = { live: boolean; has: Border | null }

const OUT: Stand = { live: false, has: null }

// null 和 OUT 是两个答案:空 tape = 这一帧不是重画(无效按压什么都不画),返回 null 让调用方保留
// 上一次读数;有重画而没有光标框才是 OUT。
export function readStand(tape: readonly Drawn[]): Stand | null {
  if (tape.length === 0) return null

  const box = tape.filter((d) => d.kind === 'poly' && d.points.length === 8).at(-1)
  if (!box || box.kind !== 'poly') return OUT

  const xs = box.points.filter((_, i) => i % 2 === 0)
  const ys = box.points.filter((_, i) => i % 2 === 1)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  if (x1 - x0 === y1 - y0) return OUT

  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const under = tape
    .filter(
      (d) =>
        d.kind === 'rect' &&
        (d.colour === WALL || d.colour === MAYBE || d.colour === NO || d.colour === ERROR) &&
        cx >= d.x &&
        cx <= d.x + d.w &&
        cy >= d.y &&
        cy <= d.y + d.h,
    )
    .at(-1)
  if (!under || under.kind !== 'rect') return { live: true, has: null }
  return {
    live: true,
    has: under.colour === NO ? 'no' : under.colour === MAYBE ? 'none' : 'wall',
  }
}

type Facts = { stand: Stand | null }

const fullGrid = (prefs: View<Facts>['prefs']) =>
  preference('palisade', prefs, 'cursor-mode') === optionAt('palisade', 'cursor-mode', 'full')

// Half-grid:光标停在边上,一按就地翻转。Full-grid:光标只停格心,确认键上游不受理
// (palisade.c:1076),边由 Ctrl/Shift+方向压出来(palisade.c:1026):改当上膛键,自己不发走子。
const borderKey = (
  id: string,
  slot: Slot,
  key: string,
  glyph: 'edge' | 'noEdge',
  word: 'edge' | 'noEdge',
  mine: Border,
  mods: Mods,
): ArrowKey<Facts> => ({
  id,
  slot,
  face: (view) => {
    const says = view.words.cursor[word]
    if (fullGrid(view.prefs)) {
      // 上膛键不看脚下:Ctrl+方向在哪一格都成立,越界由上游回绝。
      const on = view.armed?.id === id
      return { art: { glyph }, says, tip: true, on, held: on }
    }
    const stand = view.facts.stand
    return {
      art: { glyph },
      says,
      tip: true,
      on: stand?.has === mine,
      dead: !!stand && !stand.live,
    }
  },
  press: (board) => {
    if (fullGrid(board.view().prefs)) {
      board.arm(board.view().armed?.id === id ? null : { id, mods })
      return
    }
    board.arm(null)
    const stand = board.view().facts.stand
    if (stand && !stand.live) return
    board.send(key)
    // 对方的记号还压在脚下:再按一次,把自己的落上去(上游同键序循环)。
    const buries =
      !!stand?.live && stand.has !== null && stand.has !== 'none' && stand.has !== mine
    if (buries) board.send(key)
  },
})

const TIDY: Prefer<'palisade'> = { kind: 'flag', kw: 'clear-complete-regions', glyph: 'clearRegion' }

// validate_params palisade.c:164-185:宽高、区域大小各 ≥ 1;区域大小整除面积;full 下不能等于
// 面积,等于 2 时要有一维为 1。
const custom: Custom<'palisade'> = {
  fields: [
    width(1),
    height(1),
    { kind: 'int', key: 'k', word: 'regionSize', min: 1, max: AREA_MAX, role: 'count' },
  ],
  rules: [
    rule('palisade.c:174', ['k', 'w', 'h'], (v) => (v.w * v.h) % v.k !== 0),
    rule('palisade.c:178', ['k', 'w', 'h'], (v) => v.k === v.w * v.h),
    rule('palisade.c:181', ['k', 'w', 'h'], (v) => v.k === 2 && v.w !== 1 && v.h !== 1),
  ],
}

const palisade: Game<'palisade', Facts> = {
  id: 'palisade',
  upstream: { labels: 'none', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('palisade'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: (deal) => preferKeys(deal, [TIDY]),
  arrows: {
    keys: [
      ...cross<Facts>(),
      borderKey('wall', 4, 'Enter', 'edge', 'edge', 'wall', { ctrl: true }),
      borderKey('nowall', 6, ' ', 'noEdge', 'noEdge', 'no', { shift: true }),
    ],
  },
  observe: {
    init: { stand: null },
    frames: true,
    next: (facts, saw) => {
      if ('frame' in saw) {
        const seen = readStand(saw.frame)
        return seen ? { stand: seen } : facts
      }
      return facts
    },
  },
}

export default palisade
