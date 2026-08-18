// 抽象拉丁方盘面的读取:走子重放出值与铅笔标记、描述语法、余量统计。这里只吃
// 抽象 Board——盘面怎么从某个游戏的存档里读出来,是那个游戏文件的事,以 read 参数的
// 形式交进来。唯一的读者是数字键的余量角标(util/keys.ts 的 counting)。
import type { Field } from './save'
import { done, fields, find } from './save'

// 余量只数填进格子的值,铅笔标记不算——所以铺标记的走子(P、M)照样要认得出来
// (认不出一条 = 整盘拒绝),但读成 ignore:它们不动值。
export type Step =
  | { kind: 'set'; square: number; value: number }
  | { kind: 'ignore' }

export type MoveLanguage = {
  // read 必须认识该游戏能写进存档的每一种走子,不只我们自己写的那几种
  // (towers 的 D、unequal 的 F、undead 的 D 都是玩家手势的产物):
  // 认不出一条 = 整盘拒绝,而且拒绝会传染(见 replay)。
  read(text: string): Step[] | null
}

export type Board = {
  squares: number
  values: number[]
  each?: number
  clues: number[]
  moves: MoveLanguage
}

export type BoardReader = (lines: Field[]) => Board | null

export function gridMoves(size: number, spare?: RegExp): MoveLanguage {
  return {
    read(text) {
      if (text === 'M') return [{ kind: 'ignore' }]
      if (spare?.test(text)) return [{ kind: 'ignore' }]
      const parsed = /^([PR])(\d+),(\d+),(\d+)$/.exec(text)
      if (!parsed) return null
      const x = Number(parsed[2])
      const y = Number(parsed[3])
      const value = Number(parsed[4])
      if (x >= size || y >= size || value > size) return null
      // P 带非零值是铅笔标记;P 带 0 和 R 都是在写格子里的值。
      return parsed[1] === 'P' && value > 0
        ? [{ kind: 'ignore' }]
        : [{ kind: 'set', square: y * size + x, value }]
    },
  }
}

// 拒绝是会传染的:RESTART 是留在历史里的状态,拒绝它 = 拒绝其后每一次按键,
// 所以照常重放(回到 DESC 那一刻)。仍然整体拒绝的只有 SOLVE/S——求解器的答案
// 五个游戏五种写法。要再加拒绝之前,先想清楚它会不会像 RESTART 一样粘着。
export function replay(moves: Field[], board: Board, desc: string): number[] | null {
  const values = [...board.clues]

  for (const move of moves) {
    if (move.key === 'RESTART') {
      if (move.value !== desc) return null
      for (let i = 0; i < values.length; i++) values[i] = board.clues[i]
      continue
    }
    if (move.key === 'SOLVE' || move.value[0] === 'S') return null
    const steps = board.moves.read(move.value)
    if (!steps) return null
    for (const step of steps) {
      if (step.kind === 'ignore') continue
      if (step.square < 0 || step.square >= board.squares) return null
      values[step.square] = step.value
    }
  }
  return values
}

// 只数已填的值,铅笔标记不算(标记键全部建立在这个区分上)。数到零和负数由调用方
// 决定不显示:多放了的数字棋盘自己已经画红。
//
// 读不懂就整个拒绝:参数不认识、描述解析不了、走子没见过,一律 null,角标就不画。
// 猜错比不画坏得多——那会在键面上写一个错的余量。
export function remaining(save: string, read: BoardReader): Map<number, number> | null {
  const lines = fields(save)
  if (!lines) return null
  const board = read(lines)
  if (!board || board.each === undefined) return null
  const kept = done(lines)
  if (!kept) return null
  const desc = find(lines, 'DESC')
  if (desc === undefined) return null
  const values = replay(kept, board, desc)
  if (!values) return null

  const left = new Map(board.values.map((value) => [value, board.each as number]))
  for (const value of values) if (value) left.set(value, (left.get(value) ?? 0) - 1)
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

export function leadingNumber(text: string | undefined): number | null {
  const found = text ? /^(\d+)/.exec(text) : null
  if (!found) return null
  const n = Number(found[1])
  return n >= 1 && n <= 36 ? n : null
}
