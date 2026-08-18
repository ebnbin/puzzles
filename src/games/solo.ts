// Solo:数独(含 Killer、Jigsaw、X 变体)。上游 solo.c。
// 数字键盘按参数推(重新实现 request_keys 的结果,emcc.c 不调用它),认不出的
// 参数一律不显示键盘;对不对得上由 scripts/check-keys.mjs 去问引擎。
// 读盘器解析 Solo 的参数/描述/走子,喂给数字键的余量角标。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board } from './util/latin'
import { gridMoves, runLengthGrid } from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, marksKey } from './util/keys'
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

export function readSolo(lines: Field[]): Board | null {
  const parsed = params(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? '')
  if (!parsed) return null
  const size = parsed.c * parsed.r
  const area = size * size

  const described = runLengthGrid(find(lines, 'PRIVDESC') ?? find(lines, 'DESC') ?? '', area)
  if (!described) return null

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues: described.grid,
    moves: gridMoves(size),
  }
}

const solo: Game<Counted> = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params: p }) => {
    const parsed = params(p)
    if (!parsed) return null
    const cr = parsed.c * parsed.r
    return [
      ...digitKeys<Counted>(cr, { left: (facts, value) => facts.left?.get(value) }),
      clearKey(),
      marksKey(),
    ]
  },
  arrows: {
    keys: [
      ...cross<Counted>(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: counting(readSolo),
}

export default solo
