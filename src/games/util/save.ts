// 存档文件的通用语法(SAVEFILE 的 key:len:value 行、状态序列、redo 尾巴)。
// 这里只认 midend 的格式,不认任何游戏的走子语法——那是各游戏文件自己的事。
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

// 走存档门写走子并补闪:pending 把最后一步留在 redo 尾巴,load 后 redo 落回。
export function loadExtended(
  gate: { load(text: string): void; redo(): void },
  next: string,
): void {
  const held = pending(next)
  gate.load(held ?? next)
  if (held) gate.redo()
}
