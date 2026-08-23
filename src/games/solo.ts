// Solo:数独(含 Killer、Jigsaw、X 变体)。上游 solo.c。
// 数字键盘按参数推(重新实现 request_keys 的结果,emcc.c 不调用它),认不出的
// 参数一律不显示键盘;对不对得上由 scripts/check-keys.mjs 去问引擎。
import type { DialogControl } from '../engine/types'
import type { Field, Game, Span } from './game'
import { still } from './game'
import { keepPencil, samePages, verbatim } from './util/declare'
import { flagAt, numberAt } from './util/fields'
import { PENCIL_HIGHLIGHT, clearKey, digitKeys, marksKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'

function params(text: string): { c: number; r: number } | null {
  const first = /^(\d+)/.exec(text)
  if (!first) return null
  let c = Number(first[1])
  let r = c
  let seenR = false
  let at = first[1].length

  if (text[at] === 'x') {
    const second = /^(\d+)/.exec(text.slice(at + 1))
    if (!second) return null
    r = Number(second[1])
    seenR = true
    at += 1 + second[1].length
  }

  while (at < text.length) {
    const ch = text[at]
    if (ch === 'j') {
      at += 1
      if (seenR) c *= r
      r = 1
    } else if (ch === 'x' || ch === 'k') {
      at += 1
    } else if (ch === 'r' || ch === 'm' || ch === 'a') {
      at += 1
      if (ch === 'm' && text[at] === 'd') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    } else if (ch === 'd') {
      at += 1
      if (!'tbiaeu'.includes(text[at])) return null
      at += 1
    } else {
      return null
    }
  }

  const cr = c * r
  if (!Number.isInteger(cr) || cr < 1 || cr > 36) return null
  return { c, r }
}

// game_configure 的下标(solo.c:448)。[2] [4] 是勾选框,[5] [6] 是下拉,不归这里管。
const COLS = 0
const ROWS = 1
const XTYPE = 2
const JIGSAW = 3
const KILLER = 4

// 上游的硬界(solo.c:516)全落在边长 N = c×r 上:N ≤ 31(符号最多 31 个)、
// Killer 要 N ≤ 9、X 要 N ≥ 4;另外 c ≥ 2。
const reach = (controls: readonly DialogControl[]) => ({
  lo: flagAt(controls, XTYPE) ? 4 : 2,
  hi: flagAt(controls, KILLER) ? 9 : 31,
})

const sideAt = (controls: readonly DialogControl[], at: number, fallback: number) => {
  const n = numberAt(controls, at)
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : fallback
}

// 上界够不到下界时先让下界赢:另一条界下一轮会把对面拖回来,settle 反复走到不动。
const between = (min: number, max: number): Span => ({ min, max: Math.max(min, max) })

const cols = (controls: readonly DialogControl[]): Span => {
  const { lo, hi } = reach(controls)
  const r = sideAt(controls, ROWS, 1)
  return between(Math.max(2, Math.ceil(lo / r)), Math.floor(hi / r))
}

// **Jigsaw 就是 r == 1**(solo.c:217):勾选框只是 params->r == 1 的回显,勾上时
// custom_params 做的是 c *= r; r = 1。两头都得钉死才不说谎——勾上时 r 只能是 1
// (否则 c 会被偷偷乘一遍),不勾时 r 至少 2(否则「取消勾选」存回去还是 Jigsaw,
// 实测 2x1 回读就是 2j)。r = 0 另说:上游只查 c 的下界,0 一路走到
// encode_solve_move 的断言炸掉。
const rows = (controls: readonly DialogControl[]): Span => {
  if (flagAt(controls, JIGSAW)) return { min: 1, max: 1 }
  const { lo, hi } = reach(controls)
  const c = sideAt(controls, COLS, 2)
  return between(Math.max(2, Math.ceil(lo / c)), Math.floor(hi / c))
}

const fields: readonly Field[] = [
  { at: COLS, label: 'Columns of sub-blocks', span: cols },
  { at: ROWS, label: 'Rows of sub-blocks', span: rows },
]

const solo: Game = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: { menu: verbatim },
  fields,
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: ({ params: p, prefs }) => {
    const parsed = params(p)
    if (!parsed) return null
    const cr = parsed.c * parsed.r
    return [
      ...digitKeys(cr),
      clearKey(),
      marksKey(),
      ...preferKeys(prefs, [PENCIL_HIGHLIGHT]),
    ]
  },
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: still,
}

export default solo
