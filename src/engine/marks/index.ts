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

// 读不懂就整个拒绝:参数不认识、描述解析不了、走子没见过,一律 null,界面什么
// 都不做。猜错比不做坏得多——会擦掉玩家写的候选,还会说某个数字不可能。
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
  // 判「棋盘是否一个候选都没有」要跳过已填格:Undead 的怪物格下压着看不见、
  // 擦不掉的旧标记(G/V/Z 不清标记),它们不能参与这个裁决。
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

// 和 fillMarks 方向相反,这是设计:fillMarks 读值写候选、这里读候选写值,
// 谁都喂不到自己,连按两次第二次一定什么都不做。绝不能在这里按规则重算候选——
// 那会让它自己就能一直跑下去,正是要避免的循环;只读棋盘上写着的。
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

    // 隐式单候选的前提缺一不可:组里有「空着但零候选」的格子就整组跳过
    // (那种格子读起来像什么都不能填,会凭空造出唯一解);已填的值不再算候选;
    // 外层循环跑到不动点才幂等。少任何一个都会写出能被规则证明是错的数字。
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

// 只数已填的值,铅笔标记不算——另外三个键全部建立在这个区分上。数到零和负数
// 由调用方决定不显示:多放了的数字棋盘自己已经画红。
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
