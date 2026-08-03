import { latinGroups, leadingNumber } from './desc'
import type { Field } from './save'
import { find } from './save'
import type { Board } from './board'

/**
 * Unequal: a Latin square, plus what the marks between the squares say.
 *
 * Two modes, and the description does not say which — the parameters do, with
 * an `a` for Adjacent. They read the same flags and mean opposite kinds of
 * thing by them:
 *
 *   Unequal   a flag on a square means that square is greater than the
 *             neighbour it points at. `check_num_adj` in unequal.c words the
 *             failure as "(x,y):n not > (x+dx,y+dy):dn", which is where this
 *             direction comes from rather than from the glyph.
 *
 *   Adjacent  a flag means the two differ by exactly one — and its *absence*
 *             means they do not, which is the stronger half. Every pair of
 *             neighbours on the board says something in this mode, so a board
 *             with three marks on it is not a board with three clues.
 *
 * The description is the squares in reading order, comma separated: any run
 * letters for squares left out, then the number (0 for empty), then any of
 * `URDL`. A number that is not zero is a given, and immutable.
 */

/** Which way each flag points, in the order unequal.c's `adjthan` lists them. */
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
  // `a` after the size and the difficulty is Adjacent mode. Anything else in
  // there is the difficulty letter, which is spent once the deal is made.
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

  /*
   * In Adjacent mode every pair of neighbours is spoken for, so the pairs
   * without a mark have to be listed as well as the ones with. Held as a set
   * of the marked pairs, keyed both ways round, since the description records
   * only one side of each.
   */
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
    size,
    clues,
    groups: latinGroups(size),
    passthrough: /^F\d+,\d+,\d+$/,
    narrow: (candidates, digits) => {
      const allow = (cell: number, keep: (n: number) => boolean) => {
        if (digits[cell]) return
        for (const n of [...candidates[cell]]) if (!keep(n)) candidates[cell].delete(n)
      }

      /*
       * A square with nothing left it could be says nothing about its
       * neighbours. That only happens on a board the reader has contradicted,
       * and without this guard the emptiness spreads: a square with no
       * candidates has no smallest one, so the sign below would read its floor
       * as impossible and empty the square across from it, and that one the
       * next. One square saying "nothing fits here" is a fact about that
       * square; a row of them is this rule talking to itself.
       */
      const open = (cell: number) => digits[cell] || candidates[cell].size > 0

      if (adjacent) {
        for (const [a, b] of neighbours) {
          const near = both(a, b)
          // Either way round it is the same question asked of both squares:
          // is there anything the other one could be that agrees with this?
          const ok = (mine: number, other: Set<number>, value: number) =>
            value
              ? near === (Math.abs(mine - value) === 1)
              : [...other].some((n) => near === (Math.abs(mine - n) === 1))
          if (open(b)) allow(a, (n) => ok(n, candidates[b], digits[b]))
          if (open(a)) allow(b, (n) => ok(n, candidates[a], digits[a]))
        }
        return
      }

      for (const { from, to } of signs) {
        // `from` is the greater. With the other square filled in this is a
        // hard bound; with it still open, the best the sign can say is that
        // the greater cannot be the smallest thing the other could be, or
        // below it.
        if (open(to)) {
          const floor = digits[to] ? digits[to] : Math.min(...candidates[to])
          allow(from, (n) => n > floor)
        }
        if (open(from)) {
          const ceiling = digits[from] ? digits[from] : Math.max(...candidates[from])
          allow(to, (n) => n < ceiling)
        }
      }
    },
  }
}
