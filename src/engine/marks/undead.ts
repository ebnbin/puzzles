import type { Board, MoveLanguage, Step } from './board'
import type { Field } from './save'
import { find } from './save'

/**
 * Undead: a mirror maze with a monster in every square that is not a mirror.
 *
 * The odd one out among the five, and the reason `Board` counts squares rather
 * than laying out a grid. There are no rows or columns here — every square
 * holds a monster, and nothing says two of them may not be the same. What is
 * constrained is how many can be *seen*.
 *
 *   totals     the deal states how many ghosts, vampires and zombies there are
 *              in all. Once the last ghost is on the board, no empty square can
 *              be one.
 *
 *   sightings  a clue counts the monsters visible along one line of sight,
 *              which bounces off the mirrors as it goes. Walking it, a vampire
 *              counts before the first mirror and a ghost after one — they are
 *              opposites, per the manual: vampires are invisible in mirrors and
 *              ghosts are invisible without one — and a zombie counts always.
 *              A line that crosses the same square twice counts it twice, which
 *              the manual is explicit about.
 *
 * So each square adds a known amount to each clue for each monster it might
 * hold, and the clue bounds the total. A monster is impossible in a square when
 * no assignment of the others, each within its own range, can reach the clue.
 * That is one line of sight at a time, looking at the squares that line names —
 * the same shape of rule as Towers' visibility bound, and it stops in the same
 * place: it never asks where a monster could go instead.
 *
 * ---------------------------------------------------------------------------
 * ONE STEP BACK OUT
 * ---------------------------------------------------------------------------
 *
 * Alone among the five, Undead's `execute_move` loops until the move string
 * runs out, taking as many moves as are joined with `;`. So a whole board's
 * worth of marks is one move, one state, and one press of undo — where the four
 * digit grids cost a state per mark, because a move string there does one thing
 * and there is no joining it to the next.
 */

/** The three, valued as undead.c values them: one bit each. */
const GHOST = 1
const VAMPIRE = 2
const ZOMBIE = 4
const MONSTERS = [GHOST, VAMPIRE, ZOMBIE]

/** What the description writes for each, and what a move calls it. */
const LETTER: Record<number, string> = { [GHOST]: 'G', [VAMPIRE]: 'V', [ZOMBIE]: 'Z' }
const FROM_LETTER: Record<string, number> = { G: GHOST, V: VAMPIRE, Z: ZOMBIE }

/** Anything past this and the description was misread, not merely unusual. */
const MAX_SIDE = 32

/**
 * undead.c's `range2grid`: an edge position, as a square just outside the grid
 * and the direction a line of sight enters from. The four sides run clockwise
 * from the top, and the last two run backwards along their edge.
 */
function edge(i: number, w: number, h: number) {
  if (i < w) return { x: i + 1, y: 0, dx: 0, dy: 1 }
  i -= w
  if (i < h) return { x: w + 1, y: i + 1, dx: -1, dy: 0 }
  i -= h
  if (i < w) return { x: w - i, y: h + 1, dx: 0, dy: -1 }
  i -= w
  return { x: 0, y: h - i, dx: 1, dy: 0 }
}

/** And back again, for the far end of a line. -1 for anywhere inside. */
function edgeOf(x: number, y: number, w: number, h: number): number {
  if (x > 0 && x < w + 1 && y > 0 && y < h + 1) return -1
  if (y === 0) return x - 1
  if (x === w + 1) return w + y - 1
  if (y === h + 1) return w + h + (w - x)
  if (x === 0) return 2 * w + h + (h - y)
  return -1
}

/** A line of sight, as the squares it passes through in order. */
type Sight = {
  /** Square numbers, and -1 for each mirror it turns on. */
  walk: number[]
  /** The edge positions it runs between, which is where its two clues are. */
  ends: [number, number]
}

/**
 * How much each square would add to one clue, per monster, walking the line
 * from one end.
 *
 * Everything before the first mirror is seen directly and everything after one
 * is seen in a mirror, so the walk carries that single flag and nothing else.
 * A square met twice adds twice.
 */
function weigh(walk: number[]): Map<number, Record<number, number>> {
  const out = new Map<number, Record<number, number>>()
  let mirrored = false
  for (const step of walk) {
    if (step === -1) {
      mirrored = true
      continue
    }
    const seen = out.get(step) ?? { [GHOST]: 0, [VAMPIRE]: 0, [ZOMBIE]: 0 }
    if (mirrored) seen[GHOST] += 1
    else seen[VAMPIRE] += 1
    seen[ZOMBIE] += 1
    out.set(step, seen)
  }
  return out
}

/**
 * Undead's moves.
 *
 * `G n`, `V n` and `Z n` put a monster in square n and `E n` empties it; the
 * same letters in lower case turn one mark over. `D` crosses a clue off and
 * touches neither. Several may be joined with `;`, which is what makes a whole
 * board's marks one state.
 *
 * Only `E` clears the marks under a square — see the note on `Step`.
 */
const moves: MoveLanguage = {
  read(text) {
    const steps: Step[] = []
    for (const part of text.split(';')) {
      if (part === '') continue
      if (part === 'M') {
        steps.push({ kind: 'fill' })
        continue
      }
      if (/^D-?\d+,-?\d+$/.test(part)) {
        steps.push({ kind: 'ignore' })
        continue
      }
      const parsed = /^([GVZEgvz])(\d+)$/.exec(part)
      if (!parsed) return null
      const [, kind, index] = parsed
      const square = Number(index)
      // Only `E` clears what is written under a square. `G`, `V` and `Z` leave
      // the marks where they are — undead.c's `execute_move` says so, and the
      // board simply stops drawing them once a monster is on top.
      if (kind === 'E') steps.push({ kind: 'set', square, value: 0, clears: true })
      else if (kind === kind.toUpperCase())
        steps.push({ kind: 'set', square, value: FROM_LETTER[kind], clears: false })
      else
        steps.push({ kind: 'toggle', square, value: FROM_LETTER[kind.toUpperCase()] })
    }
    return steps
  },
  toggle: (square, value) => `${LETTER[value].toLowerCase()}${square}`,
  wipe: (square) => `E${square}`,
  chain: ';',
}

export function readUndead(lines: Field[]): Board | null {
  const params = find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? ''
  const shape = /^(\d+)x(\d+)/.exec(params)
  if (!shape) return null
  const w = Number(shape[1])
  const h = Number(shape[2])
  if (w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE) return null

  /*
   * Three totals, the mirror layout, and then one clue per edge position —
   * four sides' worth, and an empty entry where a side says nothing.
   */
  const parts = (find(lines, 'DESC') ?? '').split(',')
  if (parts.length !== 4 + 2 * (w + h)) return null
  const totals: Record<number, number> = {
    [GHOST]: Number(parts[0]),
    [VAMPIRE]: Number(parts[1]),
    [ZOMBIE]: Number(parts[2]),
  }
  if (MONSTERS.some((m) => !Number.isInteger(totals[m]) || totals[m] < 0)) return null
  const clues = parts.slice(4).map((text) => (text === '' ? -1 : Number(text)))
  if (clues.some((n) => !Number.isInteger(n))) return null

  /*
   * The grid is laid out with a border all round, the way undead.c holds it, so
   * a line of sight can step off the edge and be recognised there. Mirrors are
   * `L` and `R`; a monster given in the deal is its letter; a run of letters
   * from `a` is that many empty squares. Only the squares that are not mirrors
   * are numbered, and that numbering is what every move addresses.
   */
  const kind = new Array<string>((w + 2) * (h + 2)).fill('')
  const number = new Array<number>((w + 2) * (h + 2)).fill(-1)
  const clueOf: number[] = []
  let at = 0
  let squares = 0
  const place = (what: string, monster: number) => {
    if (at >= w * h) return false
    const x = (at % w) + 1
    const y = Math.floor(at / w) + 1
    kind[x + y * (w + 2)] = what
    if (what === '.') {
      number[x + y * (w + 2)] = squares
      clueOf[squares++] = monster
    }
    at += 1
    return true
  }
  for (const ch of parts[3]) {
    let ok = true
    if (ch === 'L' || ch === 'R') ok = place(ch, 0)
    else if (ch in FROM_LETTER) ok = place('.', FROM_LETTER[ch])
    else if (ch >= 'a' && ch <= 'z')
      for (let n = ch.charCodeAt(0) - 96; n > 0 && ok; n--) ok = place('.', 0)
    else return null
    if (!ok) return null
  }
  if (at !== w * h) return null
  if (MONSTERS.reduce((n, m) => n + totals[m], 0) !== squares) return null

  /*
   * The lines of sight, traced the way `make_paths` traces them: in from an
   * edge, turning at each mirror, until it steps out again. Each line is found
   * once — the far end is the same line looked at backwards — and carries a
   * clue at either end.
   */
  const sights: Sight[] = []
  const seen = new Set<number>()
  for (let i = 0; i < 2 * (w + h); i++) {
    if (seen.has(i)) continue
    let { x, y, dx, dy } = edge(i, w, h)
    const walk: number[] = []
    for (;;) {
      x += dx
      y += dy
      const out = edgeOf(x, y, w, h)
      if (out !== -1) {
        seen.add(out)
        sights.push({ walk, ends: [i, out] })
        break
      }
      const here = kind[x + y * (w + 2)]
      if (here === 'L') {
        walk.push(-1)
        ;[dx, dy] = dx === 0 ? [dy, 0] : [0, dx]
      } else if (here === 'R') {
        walk.push(-1)
        ;[dx, dy] = dx === 0 ? [-dy, 0] : [0, -dx]
      } else {
        walk.push(number[x + y * (w + 2)])
      }
      // A line cannot be longer than every square twice over; if it is, the
      // mirrors were misread and it is going round for ever.
      if (walk.length > 4 * w * h) return null
    }
  }

  return {
    squares,
    values: MONSTERS,
    clues: clueOf,
    // No two squares here are under any rule to differ. Everything Undead says
    // it says through the totals and the sight lines.
    groups: [],
    moves,
    narrow: (candidates, values) => {
      const cross = (square: number, keep: (m: number) => boolean) => {
        if (values[square]) return
        for (const m of [...candidates[square]]) if (!keep(m)) candidates[square].delete(m)
      }

      // The totals. A monster with none left to place cannot be anywhere new.
      const placed: Record<number, number> = { [GHOST]: 0, [VAMPIRE]: 0, [ZOMBIE]: 0 }
      for (const m of values) if (m) placed[m] += 1
      for (const m of MONSTERS)
        if (placed[m] >= totals[m])
          for (let square = 0; square < squares; square++) cross(square, (mine) => mine !== m)

      // And each line of sight, from both of its ends.
      for (const sight of sights) {
        for (const [walk, end] of [
          [sight.walk, sight.ends[0]],
          [[...sight.walk].reverse(), sight.ends[1]],
        ] as [number[], number][]) {
          const clue = clues[end]
          if (clue < 0) continue
          const weights = weigh(walk)

          let fixed = 0
          const open: [number, Record<number, number>][] = []
          for (const [square, weight] of weights) {
            if (values[square]) fixed += weight[values[square]]
            else open.push([square, weight])
          }
          // A square with nothing left it could be says nothing about the rest
          // of the line, the way a contradicted square says nothing about its
          // neighbours in Unequal. Without this the emptiness would spread.
          if (open.some(([square]) => candidates[square].size === 0)) continue

          const least = new Map<number, number>()
          const most = new Map<number, number>()
          let leastAll = 0
          let mostAll = 0
          for (const [square, weight] of open) {
            const each = [...candidates[square]].map((m) => weight[m])
            const low = Math.min(...each)
            const high = Math.max(...each)
            least.set(square, low)
            most.set(square, high)
            leastAll += low
            mostAll += high
          }

          for (const [square, weight] of open) {
            const restLeast = leastAll - least.get(square)!
            const restMost = mostAll - most.get(square)!
            cross(
              square,
              (m) =>
                fixed + weight[m] + restLeast <= clue && fixed + weight[m] + restMost >= clue,
            )
          }
        }
      }
    },
  }
}
