// Tents:树旁扎营。上游 tents.c。T/N 是上游的绝对键;「脚下已经是自己那个值」
// 时改发 B 清空——上游的词分不出帐篷和草,脚下是什么从走子表读(存档的只读
// 半边:game_ui 不重建、光标不丢、照闪)。树上两个键一起灰(标签两词俱空)。
import type { Game } from './game'
import { keyOf, plain } from './game'
import { samePages, verbatim } from './util/declare'
import { fields, find } from './util/save'
import type { Spot } from './util/mirror'
import { stepCursor } from './util/mirror'
import { act, cross } from './util/pad'

export type Square = 'T' | 'N' | 'B'

export function tentsGrid(params: string): { w: number; h: number } | null {
  const m = /^(\d+)x(\d+)/.exec(params)
  if (!m) return null
  const w = +m[1]
  const h = +m[2]
  return w > 0 && h > 0 ? { w, h } : null
}

const PLACE = /^([TNB])(\d+),(\d+)$/

// STATEPOS 数的是状态数、发牌是第 1 个,已生效走子 = 前 STATEPOS-1 条,其后是
// redo 尾巴;++played >= at 的 break 必须发生在处理该条之前,差一就把 redo 读进
// 棋盘——撤销后 squareAt 报「未来」的值,两个开关方向反转。
function written(save: string): Map<string, Square> | null {
  const lines = fields(save)
  if (!lines) return null
  const at = Number(find(lines, 'STATEPOS'))
  if (!Number.isInteger(at) || at < 1) return null
  const grid = new Map<string, Square>()
  let played = 0
  for (const f of lines) {
    if (f.key !== 'MOVE' && f.key !== 'SOLVE' && f.key !== 'RESTART') continue
    if (++played >= at) break
    if (f.key === 'RESTART') {
      grid.clear()
      continue
    }
    const parts = f.value.split(';')
    if (f.key === 'SOLVE') {
      if (parts[0] !== 'S') return null
      grid.clear()
      parts.shift()
    }
    for (const part of parts) {
      const m = PLACE.exec(part)
      if (!m) return null
      grid.set(`${m[2]},${m[3]}`, m[1] as Square)
    }
  }
  return grid
}

export function squareAt(save: string, at: Spot): Square | null {
  const grid = written(save)
  return grid && (grid.get(`${at.x},${at.y}`) ?? 'B')
}

type Facts = {
  grid: { w: number; h: number } | null
  spot: Spot
  under: Square | null
}

const tents: Game<Facts> = {
  id: 'tents',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('tents'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross<Facts>(),
      act({
        id: 'tent',
        slot: 4,
        key: 'T',
        idle: { glyph: 'tent', word: 'tent' },
        switches: 'B',
        on: (view) => view.facts.under === 'T',
      }),
      act({
        id: 'grass',
        slot: 6,
        key: 'N',
        idle: { glyph: 'grass', word: 'grass' },
        switches: 'B',
        on: (view) => view.facts.under === 'N',
      }),
    ],
  },
  observe: {
    init: { grid: null, spot: { x: 0, y: 0 }, under: null },
    saves: true,
    next: (facts, saw) => {
      if ('deal' in saw)
        return {
          grid: tentsGrid(saw.deal.split(':')[0]),
          spot: { x: 0, y: 0 },
          under: null,
        }
      if ('sent' in saw && plain(saw.sent) && facts.grid)
        return { ...facts, spot: stepCursor(facts.spot, keyOf(saw.sent), facts.grid) }
      if ('moved' in saw) return { ...facts, under: squareAt(saw.moved, facts.spot) }
      return facts
    },
  },
}

export default tents
