// Keen:算式笼子的拉丁方。上游 keen.c。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board, CageOp } from './util/latin'
import {
  blockCells,
  cageDigits,
  dividerBlocks,
  gridMoves,
  latinGroups,
  leadingNumber,
} from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, markActions, marksKey } from './util/keys'
import { act, cross } from './util/pad'

const OPS: Record<string, CageOp> = { a: 'a', m: 'm', s: 's', d: 'd' }

export function readKeen(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS'))
  if (!size) return null
  const area = size * size

  const desc = find(lines, 'DESC') ?? ''
  const comma = desc.indexOf(',')
  if (comma < 0) return null
  // 25 = 'y',不是 solo 的 26/'z':依据是 keen.c:856 的代码(adv = (c != 25)),
  // 那一行旁边的上游注释写着 'z',是错的,别照它「修」。
  const block = dividerBlocks(desc.slice(0, comma), size, { open: 25, repeats: true })
  if (!block) return null

  const cells = blockCells(block)
  if (cells.length === 0 || cells.some((c) => !c || c.length === 0)) return null

  const cages: { cells: number[]; value: number; op: CageOp }[] = []
  let at = comma + 1
  const text = desc
  for (const group of cells) {
    const kind = text[at]
    at += 1
    if (kind === 'n') {
      continue
    }
    const op = OPS[kind]
    if (!op) return null
    const number = /^\d+/.exec(text.slice(at))
    if (!number) return null
    at += number[0].length
    if ((op === 's' || op === 'd') && group.length !== 2) return null
    cages.push({ cells: group, value: Number(number[0]), op })
  }
  if (at !== text.length) return null

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues: new Array<number>(area).fill(0),
    groups: latinGroups(size),
    moves: gridMoves(size),
    narrow: (candidates, values) => {
      for (const { cells: group, value: total, op } of cages) {
        const allowed = cageDigits(group, total, op, size, candidates, values, false)
        if (!allowed) continue
        group.forEach((cell, i) => {
          if (values[cell]) return
          for (const n of [...candidates[cell]])
            if (!allowed[i].has(n)) candidates[cell].delete(n)
        })
      }
    },
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
      ...markActions(readKeen),
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
