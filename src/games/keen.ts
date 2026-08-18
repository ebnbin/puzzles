// Keen:算式笼子的拉丁方。上游 keen.c。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board } from './util/latin'
import { gridMoves, leadingNumber } from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, marksKey } from './util/keys'
import { act, cross } from './util/pad'

// 只解到「多大的盘」为止:算式笼子是候选推理才要的,数字键的余量角标只数走子。
export function readKeen(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS'))
  if (!size) return null

  return {
    squares: size * size,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues: new Array<number>(size * size).fill(0),
    moves: gridMoves(size),
  }
}

const keen: Game<Counted> = {
  id: 'keen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('keen'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params }) => {
    const size = leadingNumber(params)
    if (!size) return null
    return [
      ...digitKeys<Counted>(size, { left: (facts, value) => facts.left?.get(value) }),
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
  observe: counting(readKeen),
}

export default keen
