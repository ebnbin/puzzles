// Towers:从塔的可见数推高度的拉丁方。上游 towers.c。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board } from './util/latin'
import { gridMoves, leadingNumber, runLengthGrid } from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, marksKey } from './util/keys'
import { act, cross } from './util/pad'

// 只读到「多大的盘 + 哪几格已经填了」为止:塔的可见数是候选收窄才要的。
export function readTowers(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS'))
  if (!size) return null
  const area = size * size

  const desc = find(lines, 'DESC') ?? ''
  const comma = desc.indexOf(',')
  let grid = new Array<number>(area).fill(0)
  if (comma >= 0) {
    const described = runLengthGrid(desc.slice(comma + 1), area)
    if (!described || described.rest !== '') return null
    grid = described.grid
  }

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues: grid,
    // 负号不是装饰:线索按所在位置寻址,在网格外——上/左是 -1(towers.c 的
    // is_clue),所以 D-1,3 是玩家划掉线索的真实走子,收紧正则会让整局键死掉。
    moves: gridMoves(size, /^D-?\d+,-?\d+$/),
  }
}

const towers: Game<Counted> = {
  id: 'towers',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('towers'),
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
  observe: counting(readTowers),
}

export default towers
