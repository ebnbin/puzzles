// Towers:从塔的可见数推高度的拉丁方。上游 towers.c。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board } from './util/latin'
import { gridMoves, latinGroups, leadingNumber, runLengthGrid } from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, markActions, marksKey } from './util/keys'
import { act, cross } from './util/pad'

function line(index: number, size: number): { start: number; step: number } {
  if (index < size) return { start: index, step: size }
  if (index < 2 * size)
    return { start: (size - 1) * size + (index - size), step: -size }
  if (index < 3 * size) return { start: size * (index - 2 * size), step: 1 }
  return { start: size * (index - 3 * size) + (size - 1), step: -1 }
}

export function readTowers(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS'))
  if (!size) return null
  const area = size * size

  const desc = find(lines, 'DESC') ?? ''
  const comma = desc.indexOf(',')
  const head = comma < 0 ? desc : desc.slice(0, comma)
  const parts = head.split('/')
  if (parts.length !== 4 * size) return null

  const clues = parts.map((text) => {
    if (text === '') return 0
    if (!/^\d+$/.test(text)) return -1
    const n = Number(text)
    return n >= 1 && n <= size ? n : -1
  })
  if (clues.some((n) => n < 0)) return null

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
    groups: latinGroups(size),
    // 负号不是装饰:线索按所在位置寻址,在网格外——上/左是 -1(towers.c 的
    // is_clue),所以 D-1,3 是玩家划掉线索的真实走子,收紧正则会让整局键死掉。
    moves: gridMoves(size, /^D-?\d+,-?\d+$/),
    narrow: (candidates, values) => {
      for (let index = 0; index < clues.length; index++) {
        const clue = clues[index]
        if (!clue) continue
        const { start, step } = line(index, size)
        for (let i = 0; i < size; i++) {
          const cell = start + i * step
          if (values[cell]) continue
          const most = size - clue + 1 + i
          for (const n of [...candidates[cell]]) if (n > most) candidates[cell].delete(n)
        }
        // 通用上界 size-k+1+i 在 k=1 时等于 size+i,什么都排不掉:「看到 1 个 =
        // 近端是最高塔」必须单独写,这个特例不被上面的公式蕴含。
        if (clue === 1 && !values[start]) {
          for (const n of [...candidates[start]]) if (n !== size) candidates[start].delete(n)
        }
      }
    },
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
      ...markActions(readTowers),
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
