// 拉丁方家族的推理:候选、铺候选、摆单值、清标记,外加 cage 枚举。
// 盘面怎么从存档里读出来在 util/latin.ts,那半边照着上游的解码器写、有源码可对;
// 这里只负责「想」,一步都没有上游背书,错了没有任何检查会报。
import type { Key } from '../game'
import type { Board, BoardReader } from '../util/latin'
import { readPosition } from '../util/latin'
import { extend } from '../util/save'
import { deduceKey } from './deduce'

// 拉丁方家族的三个推理键:留下仍可能的、摆上唯一解、清空全部。
export function latinDeduce<F>(read: BoardReader): Key<F>[] {
  return [
    deduceKey('possible', (save) => fillMarks(save, read)),
    deduceKey('single', (save) => placeSingles(save, read)),
    deduceKey('blank', (save) => clearMarks(save, read)),
  ]
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

function fillMarks(save: string, read: BoardReader): string | null {
  const state = readPosition(save, read)
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
function placeSingles(save: string, read: BoardReader): string | null {
  const state = readPosition(save, read)
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

function clearMarks(save: string, read: BoardReader): string | null {
  const state = readPosition(save, read)
  if (!state) return null
  const { lines, board, kept, position } = state

  const wanted: string[] = []
  for (let square = 0; square < board.squares; square++) {
    if (position.values[square] || position.marks[square].size === 0) continue
    wanted.push(board.moves.wipe(square))
  }

  return extend(lines, kept, wanted, board.moves.chain)
}

// ---------------------------------------------------------------- cage 枚举

const LIMIT = 200_000

export type CageOp = 'a' | 'm' | 's' | 'd'

// 返回 null 的意思是「这个 cage 放着别动」(枚举超限或无解都是),调用方
// continue,不是整盘拒绝——无解只说明玩家棋盘已矛盾,清空该 cage 的候选同样
// 是错的方向:标记多了只是不整洁,少了就是错。
export function cageDigits(
  cells: number[],
  value: number,
  op: CageOp,
  size: number,
  candidates: Set<number>[],
  digits: number[],
  // Killer 传 true(cage 内数字不得重复是上游明文规则,且 cage 不保证同行同列,
  // 从 groups 推不出来);Keen 传 false(cage 内允许重复,只受拉丁方限制)。
  // 两个布尔不能「统一」,统一哪边都会写错标记。
  distinct: boolean,
): Set<number>[] | null {
  const count = cells.length
  const options = cells.map((cell) =>
    digits[cell] ? [digits[cell]] : [...candidates[cell]].sort((a, b) => a - b),
  )
  if (options.some((list) => list.length === 0)) return null

  const seen = cells.map(() => new Set<number>())

  if (op === 's' || op === 'd') {
    if (count !== 2) return null
    let any = false
    for (const a of options[0]) {
      for (const b of options[1]) {
        if (clash(cells, size, distinct, 0, 1, a, b)) continue
        const fits =
          op === 's' ? Math.abs(a - b) === value : a === b * value || b === a * value
        if (!fits) continue
        seen[0].add(a)
        seen[1].add(b)
        any = true
      }
    }
    return any ? seen : null
  }

  const chosen = new Array<number>(count)
  let visited = 0
  let stopped = false
  let any = false

  const walk = (at: number, acc: number) => {
    if (stopped) return
    if (++visited > LIMIT) {
      stopped = true
      return
    }
    if (at === count) {
      if (acc !== value) return
      for (let i = 0; i < count; i++) seen[i].add(chosen[i])
      any = true
      return
    }
    for (const n of options[at]) {
      let bad = false
      for (let j = 0; j < at && !bad; j++)
        if (chosen[j] === n) bad = clash(cells, size, distinct, at, j, n, n)
      if (bad) continue

      const next = op === 'a' ? acc + n : acc * n
      if (op === 'a') {
        if (next + (count - at - 1) > value) break
      } else if (value % next !== 0) {
        continue
      }
      chosen[at] = n
      walk(at + 1, next)
      if (stopped) return
    }
  }
  walk(0, op === 'a' ? 0 : 1)

  return stopped || !any ? null : seen
}

function clash(
  cells: number[],
  size: number,
  distinct: boolean,
  i: number,
  j: number,
  a: number,
  b: number,
): boolean {
  if (a !== b) return false
  if (distinct) return true
  const one = cells[i]
  const two = cells[j]
  return one % size === two % size || Math.floor(one / size) === Math.floor(two / size)
}
