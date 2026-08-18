// Unequal:带大小关系的拉丁方(含 Adjacent 变体)。上游 unequal.c。
import type { Field } from './util/save'
import { find } from './util/save'
import type { Game } from './game'
import { samePages, verbatim } from './util/declare'
import type { Board } from './util/latin'
import { gridMoves, latinGroups, leadingNumber } from './util/latin'
import type { Counted } from './util/keys'
import { clearKey, counting, digitKeys, hintKey, marksKey } from './util/keys'
import { latinDeduce } from './deduce/latin'
import { act, cross } from './util/pad'

const SIDES = [
  { flag: 'U', dx: 0, dy: -1 },
  { flag: 'R', dx: 1, dy: 0 },
  { flag: 'D', dx: 0, dy: 1 },
  { flag: 'L', dx: -1, dy: 0 },
] as const

type Sign = { from: number; to: number }

export function readUnequal(lines: Field[]): Board | null {
  const params = find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? ''
  const size = leadingNumber(params)
  if (!size) return null
  // Unequal 模式:flag = 带 flag 的那格 > 它指向的邻格,方向依据是 unequal.c
  // check_num_adj 的报错文案,不是屏幕上画的符号。Adjacent 模式:没有 flag 的
  // 邻对是「差 ≠ 1」的硬约束(更强的那半),只遍历 signs 会丢掉它。
  const adjacent = /a/.test(params.slice(String(size).length))
  const area = size * size

  const clues = new Array<number>(area).fill(0)
  const signs: Sign[] = []

  const desc = find(lines, 'DESC') ?? ''
  let cell = 0
  for (const entry of desc.split(',')) {
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
      const side = SIDES.find((s) => s.flag === entry[at])
      if (!side) return null
      const x = cell % size
      const y = (cell - x) / size
      const nx = x + side.dx
      const ny = y + side.dy
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) return null
      signs.push({ from: cell, to: ny * size + nx })
      at += 1
    }
    cell += 1
  }
  if (cell !== area) return null

  const marked = new Set(signs.map(({ from, to }) => `${from}:${to}`))
  const both = (a: number, b: number) => marked.has(`${a}:${b}`) || marked.has(`${b}:${a}`)

  const neighbours: [number, number][] = []
  for (let i = 0; i < area; i++) {
    const x = i % size
    const y = (i - x) / size
    if (x + 1 < size) neighbours.push([i, i + 1])
    if (y + 1 < size) neighbours.push([i, i + size])
  }

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues,
    groups: latinGroups(size),
    moves: gridMoves(size, /^F\d+,\d+,\d+$/),
    narrow: (candidates, values) => {
      const allow = (cell: number, keep: (n: number) => boolean) => {
        if (values[cell]) return
        for (const n of [...candidates[cell]]) if (!keep(n)) candidates[cell].delete(n)
      }

      // 零候选的空格对邻居什么都说明不了(没有最小候选,floor/ceiling 无从谈起):
      // 不挡住它,空白会一格传一格,玩家棋盘一处矛盾变成整行标记被擦。
      const open = (cell: number) => values[cell] || candidates[cell].size > 0

      if (adjacent) {
        for (const [a, b] of neighbours) {
          const near = both(a, b)
          const ok = (mine: number, other: Set<number>, value: number) =>
            value
              ? near === (Math.abs(mine - value) === 1)
              : [...other].some((n) => near === (Math.abs(mine - n) === 1))
          if (open(b)) allow(a, (n) => ok(n, candidates[b], values[b]))
          if (open(a)) allow(b, (n) => ok(n, candidates[a], values[a]))
        }
        return
      }

      for (const { from, to } of signs) {
        if (open(to)) {
          const floor = values[to] ? values[to] : Math.min(...candidates[to])
          allow(from, (n) => n > floor)
        }
        if (open(from)) {
          const ceiling = values[from] ? values[from] : Math.max(...candidates[from])
          allow(to, (n) => n < ceiling)
        }
      }
    },
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
      ...latinDeduce(readUnequal),
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
