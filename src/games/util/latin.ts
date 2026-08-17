// 抽象拉丁方盘面与推理:候选计算、铺候选、摆单值、清标记、余量统计。
// 这里只吃抽象 Board——盘面怎么从某个游戏的存档里读出来,是那个游戏文件的事,
// 以 read 参数的形式交进来。走存档门的约定(pending+redo 补闪)见 save.ts。
import type { Field } from './save'
import { done, extend, fields, find } from './save'

// 填值清不清该格候选,每个游戏答案不同(四个格子游戏的 R 顺手清,Undead 只有 E 清,
// 而且屏幕上看不出来——放了怪物的格子不画标记),所以 set 自带 clears,各游戏各自声明。
export type Step =
  | { kind: 'set'; square: number; value: number; clears: boolean }
  | { kind: 'toggle'; square: number; value: number }
  | { kind: 'fill' }
  | { kind: 'ignore' }

export type MoveLanguage = {
  // read 必须认识该游戏能写进存档的每一种走子,不只我们自己写的那几种
  // (towers 的 D、unequal 的 F、undead 的 D 都是玩家手势的产物):
  // 认不出一条 = 整盘拒绝,而且拒绝会传染(见 replay)。
  read(text: string): Step[] | null
  toggle(square: number, value: number): string
  set(square: number, value: number): string
  wipe(square: number): string
  // 只属于 execute_move 循环吃整串的游戏(undead 的 while (*move));四个格子
  // 游戏的 execute_move 用 sscanf 只读第一条、静默忽略分号之后的内容,
  // 给它们设 chain 会看似成功而丢走子。
  chain?: string
}

export type Board = {
  squares: number
  values: number[]
  each?: number
  clues: number[]
  // 每个组必须恰好 values.length 长(每个值在组内恰占一格)——placeSingles 的
  // 隐式单候选靠这个前提。只「互不相同」但更短的集合(Killer 的 cage)不能进
  // groups,只能进 narrow。
  groups: number[][]
  narrow?: (candidates: Set<number>[], values: number[]) => void
  moves: MoveLanguage
}

export type BoardReader = (lines: Field[]) => Board | null

export function gridMoves(size: number, spare?: RegExp): MoveLanguage {
  const at = (square: number) => `${square % size},${Math.floor(square / size)}`
  return {
    read(text) {
      if (text === 'M') return [{ kind: 'fill' }]
      if (spare?.test(text)) return [{ kind: 'ignore' }]
      const parsed = /^([PR])(\d+),(\d+),(\d+)$/.exec(text)
      if (!parsed) return null
      const x = Number(parsed[2])
      const y = Number(parsed[3])
      const value = Number(parsed[4])
      if (x >= size || y >= size || value > size) return null
      const square = y * size + x
      return parsed[1] === 'P' && value > 0
        ? [{ kind: 'toggle', square, value }]
        : [{ kind: 'set', square, value, clears: true }]
    },
    toggle: (square, value) => `P${at(square)},${value}`,
    set: (square, value) => `R${at(square)},${value}`,
    wipe: (square) => `R${at(square)},0`,
  }
}

export type Position = { values: number[]; marks: Set<number>[] }

// 拒绝是会传染的:RESTART 是留在历史里的状态,拒绝它 = 拒绝其后每一次按键,
// 所以照常重放(回到 DESC 那一刻)。仍然整体拒绝的只有 SOLVE/S——求解器的答案
// 五个游戏五种写法。要再加拒绝之前,先想清楚它会不会像 RESTART 一样粘着。
export function replay(moves: Field[], board: Board, desc: string): Position | null {
  const values = [...board.clues]
  const marks = board.clues.map(() => new Set<number>())

  for (const move of moves) {
    if (move.key === 'RESTART') {
      if (move.value !== desc) return null
      for (let i = 0; i < values.length; i++) values[i] = board.clues[i]
      for (const set of marks) set.clear()
      continue
    }
    if (move.key === 'SOLVE' || move.value[0] === 'S') return null
    const steps = board.moves.read(move.value)
    if (!steps) return null
    for (const step of steps) {
      if (step.kind === 'ignore') continue
      if (step.kind === 'fill') {
        for (let i = 0; i < values.length; i++)
          if (!values[i]) for (const v of board.values) marks[i].add(v)
        continue
      }
      if (step.square < 0 || step.square >= board.squares) return null
      if (step.kind === 'toggle') {
        if (!marks[step.square].delete(step.value)) marks[step.square].add(step.value)
      } else {
        values[step.square] = step.value
        if (step.clears) marks[step.square].clear()
      }
    }
  }
  return { values, marks }
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
export function readPosition(save: string, read: BoardReader) {
  const lines = fields(save)
  if (!lines) return null
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

export function fillMarks(save: string, read: BoardReader): string | null {
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
export function placeSingles(save: string, read: BoardReader): string | null {
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

export function clearMarks(save: string, read: BoardReader): string | null {
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

// 只数已填的值,铅笔标记不算——标记键全部建立在这个区分上。数到零和负数
// 由调用方决定不显示:多放了的数字棋盘自己已经画红。
export function remaining(save: string, read: BoardReader): Map<number, number> | null {
  const state = readPosition(save, read)
  if (!state) return null
  const { board, position } = state
  if (board.each === undefined) return null

  const left = new Map(board.values.map((value) => [value, board.each as number]))
  for (const value of position.values)
    if (value) left.set(value, (left.get(value) ?? 0) - 1)
  return left
}

// ---------------------------------------------------------------- 描述语法
// 上游拉丁方家族共用的两种编码。都按上游的「解码器」镜像,不按旁边的编码器——
// 两者在超过字母表的 run 上不一致(z:编码器写 25、解码器读 26),那个长度实际
// 尺寸下不可达;对照编码器来「校对」本文件是错的方向。

export function runLengthGrid(
  text: string,
  area: number,
): { grid: number[]; rest: string } | null {
  const grid: number[] = []
  let at = 0
  while (at < text.length && text[at] !== ',') {
    const ch = text[at]
    if (ch >= 'a' && ch <= 'z') {
      for (let i = ch.charCodeAt(0) - 96; i > 0; i--) grid.push(0)
      at += 1
    } else if (ch === '_') {
      at += 1
    } else if (ch >= '1' && ch <= '9') {
      const digits = /^\d+/.exec(text.slice(at))![0]
      grid.push(Number(digits))
      at += digits.length
    } else {
      return null
    }
  }
  if (grid.length !== area) return null
  return { grid, rest: text.slice(at) }
}

export function dividerBlocks(
  text: string,
  size: number,
  options: { open: number; repeats: boolean },
): number[] | null {
  const area = size * size
  const parent = Array.from({ length: area }, (_, i) => i)
  const findRoot = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }

  const edges = 2 * size * (size - 1)
  let pos = 0
  let at = 0
  while (at < text.length) {
    const ch = text[at]
    let count: number
    if (ch === '_') count = 0
    else if (ch >= 'a' && ch <= 'z') count = ch.charCodeAt(0) - 96
    else return null
    at += 1

    let times = 1
    if (options.repeats) {
      const repeat = /^\d+/.exec(text.slice(at))
      if (repeat) {
        times = Number(repeat[0])
        at += repeat[0].length
        if (times < 1) return null
      }
    }

    // 「不消耗分隔线、可作前缀」的字母 Solo 是 z(26)、Keen 是 y(25),且只有
    // Keen 带重复计数:这是两个上游解码器的真实差异。keen.c:856 旁边上游自己的
    // 注释写 'z',而代码是 c != 25——上游注释是错的,别照它「统一」。
    const advance = count !== options.open
    for (let t = 0; t < times; t++) {
      for (let c = count; c > 0; c--) {
        if (pos >= edges) return null
        let p0: number
        let p1: number
        if (pos < size * (size - 1)) {
          const y = Math.floor(pos / (size - 1))
          const x = pos % (size - 1)
          p0 = y * size + x
          p1 = y * size + x + 1
        } else {
          const x = Math.floor(pos / (size - 1)) - size
          const y = pos % (size - 1)
          p0 = y * size + x
          p1 = (y + 1) * size + x
        }
        parent[findRoot(p0)] = findRoot(p1)
        pos += 1
      }
      if (advance) pos += 1
    }
  }
  // 编码器以一条虚拟分隔线收尾(solo.c 同款判定),合法描述的终点就是
  // edges + 1,不是 off-by-one。
  if (pos !== edges + 1) return null

  // 块按「格子首次被遇到」的顺序编号(= 上游 dsf_minimal 的选择):Solo 无感
  // (块无序),Keen 的线索列表正按此顺序一一对应,改编号顺序线索就配错 cage。
  const numbered = new Map<number, number>()
  const block = new Array<number>(area)
  for (let i = 0; i < area; i++) {
    const root = findRoot(i)
    let n = numbered.get(root)
    if (n === undefined) numbered.set(root, (n = numbered.size))
    block[i] = n
  }
  return block
}

export function blockCells(block: number[]): number[][] {
  const out: number[][] = []
  for (let cell = 0; cell < block.length; cell++) {
    ;(out[block[cell]] ??= []).push(cell)
  }
  return out
}

export function latinGroups(size: number): number[][] {
  const groups: number[][] = []
  for (let i = 0; i < size; i++) {
    groups.push(Array.from({ length: size }, (_, j) => i * size + j))
    groups.push(Array.from({ length: size }, (_, j) => j * size + i))
  }
  return groups
}

export function leadingNumber(text: string | undefined): number | null {
  const found = text ? /^(\d+)/.exec(text) : null
  if (!found) return null
  const n = Number(found[1])
  return n >= 1 && n <= 36 ? n : null
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
