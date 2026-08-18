// Unequal:带大小关系的拉丁方(含 Adjacent 变体)。上游 unequal.c。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board } from './util/latin'
import { gridMoves, leadingNumber } from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, hintKey, marksKey } from './util/keys'
import { act, cross } from './util/pad'

// 描述里跟在数字后面的关系符号,只用来知道「这条 entry 还有几个字符要跳」。
const SIDES: readonly string[] = ['U', 'R', 'D', 'L']

// 只读到「多大的盘 + 哪几格已经填了」为止:大小关系是候选收窄才要的。描述里的
// 关系符号照旧要逐个吃掉——不吃就数不清一条 entry 有多长,后面的格号会整体错位。
export function readUnequal(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? '')
  if (!size) return null
  const area = size * size

  const clues = new Array<number>(area).fill(0)
  let cell = 0
  for (const entry of (find(lines, 'DESC') ?? '').split(',')) {
    if (entry === '') continue
    let at = 0
    while (at < entry.length && entry[at] >= 'a' && entry[at] <= 'z') {
      cell += entry.charCodeAt(at) - 96
      at += 1
    }
    const number = /^\d+/.exec(entry.slice(at))
    if (!number) return null
    if (cell >= area) return null
    const value = Number(number[0])
    if (value > size) return null
    clues[cell] = value
    at += number[0].length

    while (at < entry.length) {
      if (!SIDES.includes(entry[at])) return null
      at += 1
    }
    cell += 1
  }
  if (cell !== area) return null

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues,
    moves: gridMoves(size, /^F\d+,\d+,\d+$/),
  }
}

const unequal: Game<Counted> = {
  id: 'unequal',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('unequal'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params }) => {
    const order = leadingNumber(params)
    if (!order) return null
    return [
      ...digitKeys<Counted>(order, {
        startAtZero: order > 9,
        left: (facts, value) => facts.left?.get(value),
      }),
      clearKey(),
      marksKey(),
      hintKey(),
    ]
  },
  arrows: {
    keys: [
      ...cross<Counted>(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: counting(readUnequal),
}

export default unequal
