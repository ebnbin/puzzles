import type { Board } from './board'

export type Field = { key: string; value: string }

const STATE_KEYS = new Set(['MOVE', 'SOLVE', 'RESTART'])

export function fields(text: string): Field[] | null {
  const out: Field[] = []
  let at = 0
  while (at < text.length) {
    if (text[at + 8] !== ':') return null
    const key = text.slice(at, at + 8).trimEnd()
    at += 9
    const colon = text.indexOf(':', at)
    if (colon < 0) return null
    const length = Number(text.slice(at, colon))
    if (!Number.isInteger(length) || length < 0) return null
    at = colon + 1
    const value = text.slice(at, at + length)
    if (value.length !== length) return null
    at += length
    if (text[at] !== '\n') return null
    at += 1
    out.push({ key, value })
  }
  return out.length > 0 ? out : null
}

export const line = (key: string, value: string) =>
  `${key.padEnd(8)}:${value.length}:${value}\n`

export const find = (lines: Field[], key: string) =>
  lines.find((f) => f.key === key)?.value

// STATEPOS 之后的状态是被 undo 掉的,写回时丢弃是模仿 midend 自己的行为
// (midend_purge_states 在新走子落上时同样扔掉 redo)——不是丢数据的 bug。
export function done(lines: Field[]): Field[] | null {
  const statepos = Number(find(lines, 'STATEPOS'))
  if (!Number.isInteger(statepos) || statepos < 1) return null
  const played = lines.filter((f) => STATE_KEYS.has(f.key))
  const kept = played.slice(0, statepos - 1)
  return kept.length === statepos - 1 ? kept : null
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

// midend_deserialise 不走 midend_finish_move,从这扇门进去的走子不会闪。
// 所以把最后一步留在 redo 列表里,loadGame 之后 redo() 落进同一条尾巴补闪;
// redo 后后端吐出的存档和「全部走子已应用」那份逐字节相同。
export function pending(save: string): string | null {
  const lines = fields(save)
  if (!lines) return null
  const states = Number(find(lines, 'NSTATES'))
  if (!Number.isInteger(states) || states < 2) return null
  return lines
    .map((f) => (f.key === 'STATEPOS' ? line(f.key, String(states - 1)) : line(f.key, f.value)))
    .join('')
}

export function extend(
  lines: Field[],
  kept: Field[],
  added: string[],
  chain?: string,
): string | null {
  const head = lines.findIndex((f) => f.key === 'NSTATES')
  if (head < 0 || added.length === 0) return null
  const written = chain === undefined ? added : [added.join(chain)]
  const states = kept.length + written.length + 1
  return (
    lines.slice(0, head).map((f) => line(f.key, f.value)).join('') +
    line('NSTATES', String(states)) +
    line('STATEPOS', String(states)) +
    kept.map((f) => line(f.key, f.value)).join('') +
    written.map((m) => line('MOVE', m)).join('')
  )
}
