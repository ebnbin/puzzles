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
  const find = (i: number): number => {
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
        parent[find(p0)] = find(p1)
        pos += 1
      }
      if (advance) pos += 1
    }
  }
  if (pos !== edges + 1) return null

  const numbered = new Map<number, number>()
  const block = new Array<number>(area)
  for (let i = 0; i < area; i++) {
    const root = find(i)
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
