export type Step =
  | { kind: 'set'; square: number; value: number; clears: boolean }
  | { kind: 'toggle'; square: number; value: number }
  | { kind: 'fill' }
  | { kind: 'ignore' }

export type MoveLanguage = {
  read(text: string): Step[] | null
  toggle(square: number, value: number): string
  set(square: number, value: number): string
  wipe(square: number): string
  chain?: string
}

export type Board = {
  squares: number
  values: number[]
  each?: number
  clues: number[]
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
