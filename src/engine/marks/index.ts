import type { Board } from './board'
import { readKeen } from './keen'
import { readSolo } from './solo'
import { readTowers } from './towers'
import { readUndead } from './undead'
import { readUnequal } from './unequal'
import type { Field } from './save'
import { done, extend, fields, find, replay } from './save'

export { pending } from './save'

const READERS: Record<string, (lines: Field[]) => Board | null> = {
  Solo: readSolo,
  Keen: readKeen,
  Towers: readTowers,
  Unequal: readUnequal,
  Undead: readUndead,
}

function candidates(board: Board, values: number[]): Set<number>[] {
  const sets = values.map((value) => (value ? new Set<number>() : new Set(board.values)))

  for (const group of board.groups) {
    const taken = new Set<number>()
    for (const square of group) if (values[square]) taken.add(values[square])
    for (const square of group)
      if (!values[square]) for (const v of taken) sets[square].delete(v)
  }

  board.narrow?.(sets, values)
  return sets
}

function readBoard(save: string) {
  const lines = fields(save)
  if (!lines) return null
  const read = READERS[find(lines, 'GAME') ?? '']
  if (!read) return null
  const board = read(lines)
  if (!board) return null
  const kept = done(lines)
  if (!kept) return null
  const desc = find(lines, 'DESC')
  if (desc === undefined) return null
  const position = replay(kept, board, desc)
  if (!position) return null
  return { lines, board, kept, position }
}

export function fillMarks(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const should = candidates(board, position.values)
  const bare = position.marks.every(
    (set, square) => position.values[square] !== 0 || set.size === 0,
  )

  const wanted: string[] = []
  for (let square = 0; square < board.squares; square++) {
    if (position.values[square]) continue
    const has = position.marks[square]
    for (const value of board.values) {
      const want = bare ? should[square].has(value) : has.has(value) && should[square].has(value)
      if (want !== has.has(value)) wanted.push(board.moves.toggle(square, value))
    }
  }

  return extend(lines, kept, wanted, board.moves.chain)
}

export function placeSingles(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const values = [...position.values]
  const marks = position.marks.map((set) => new Set(set))
  const placed = new Map<number, number>()

  const put = (square: number, value: number) => {
    values[square] = value
    marks[square].clear()
    placed.set(square, value)
  }

  for (;;) {
    let moved = false

    for (let square = 0; square < board.squares; square++) {
      if (values[square] || marks[square].size !== 1) continue
      put(square, [...marks[square]][0])
      moved = true
    }

    for (const group of board.groups) {
      if (group.length !== board.values.length) continue
      if (group.some((square) => !values[square] && marks[square].size === 0)) continue
      const spent = new Set(group.map((square) => values[square]).filter(Boolean))
      for (const value of board.values) {
        if (spent.has(value)) continue
        const homes = group.filter((square) => !values[square] && marks[square].has(value))
        if (homes.length !== 1) continue
        put(homes[0], value)
        moved = true
      }
    }

    if (!moved) break
  }

  const wanted = [...placed].map(([square, value]) => board.moves.set(square, value))
  return extend(lines, kept, wanted, board.moves.chain)
}

export function clearMarks(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const wanted: string[] = []
  for (let square = 0; square < board.squares; square++) {
    if (position.values[square] || position.marks[square].size === 0) continue
    wanted.push(board.moves.wipe(square))
  }

  return extend(lines, kept, wanted, board.moves.chain)
}

export function remaining(save: string): Map<number, number> | null {
  const state = readBoard(save)
  if (!state) return null
  const { board, position } = state
  if (board.each === undefined) return null

  const left = new Map(board.values.map((value) => [value, board.each as number]))
  for (const value of position.values)
    if (value) left.set(value, (left.get(value) ?? 0) - 1)
  return left
}
