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
  // 认不出一条 = 整盘拒绝,而且拒绝会传染(见 save.ts 的 replay)。
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
