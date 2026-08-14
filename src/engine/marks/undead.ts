import type { Board, MoveLanguage, Step } from './board'
import type { Field } from './save'
import { find } from './save'

const GHOST = 1
const VAMPIRE = 2
const ZOMBIE = 4
const MONSTERS = [GHOST, VAMPIRE, ZOMBIE]

const LETTER: Record<number, string> = { [GHOST]: 'G', [VAMPIRE]: 'V', [ZOMBIE]: 'Z' }
const FROM_LETTER: Record<string, number> = { G: GHOST, V: VAMPIRE, Z: ZOMBIE }

const MAX_SIDE = 32

function edge(i: number, w: number, h: number) {
  if (i < w) return { x: i + 1, y: 0, dx: 0, dy: 1 }
  i -= w
  if (i < h) return { x: w + 1, y: i + 1, dx: -1, dy: 0 }
  i -= h
  if (i < w) return { x: w - i, y: h + 1, dx: 0, dy: -1 }
  i -= w
  return { x: 0, y: h - i, dx: 1, dy: 0 }
}

function edgeOf(x: number, y: number, w: number, h: number): number {
  if (x > 0 && x < w + 1 && y > 0 && y < h + 1) return -1
  if (y === 0) return x - 1
  if (x === w + 1) return w + y - 1
  if (y === h + 1) return w + h + (w - x)
  if (x === 0) return 2 * w + h + (h - y)
  return -1
}

type Sight = {
  walk: number[]
  ends: [number, number]
}

// 镜前算 vampire、镜后算 ghost(手册:vampire 在镜中隐形,ghost 只在镜中可见),
// zombie 恒算;同一格被视线穿过两次就计两次,手册明说——累加不是重复计数 bug,
// 也别凭民俗直觉对调 ghost/vampire。
function weigh(walk: number[]): Map<number, Record<number, number>> {
  const out = new Map<number, Record<number, number>>()
  let mirrored = false
  for (const step of walk) {
    if (step === -1) {
      mirrored = true
      continue
    }
    const seen = out.get(step) ?? { [GHOST]: 0, [VAMPIRE]: 0, [ZOMBIE]: 0 }
    if (mirrored) seen[GHOST] += 1
    else seen[VAMPIRE] += 1
    seen[ZOMBIE] += 1
    out.set(step, seen)
  }
  return out
}

const moves: MoveLanguage = {
  read(text) {
    const steps: Step[] = []
    for (const part of text.split(';')) {
      if (part === '') continue
      if (part === 'M') {
        steps.push({ kind: 'fill' })
        continue
      }
      if (/^D-?\d+,-?\d+$/.test(part)) {
        steps.push({ kind: 'ignore' })
        continue
      }
      const parsed = /^([GVZEgvz])(\d+)$/.exec(part)
      if (!parsed) return null
      const [, kind, index] = parsed
      const square = Number(index)
      if (kind === 'E') steps.push({ kind: 'set', square, value: 0, clears: true })
      else if (kind === kind.toUpperCase())
        steps.push({ kind: 'set', square, value: FROM_LETTER[kind], clears: false })
      else
        steps.push({ kind: 'toggle', square, value: FROM_LETTER[kind.toUpperCase()] })
    }
    return steps
  },
  toggle: (square, value) => `${LETTER[value].toLowerCase()}${square}`,
  set: (square, value) => `${LETTER[value]}${square}`,
  wipe: (square) => `E${square}`,
  chain: ';',
}

export function readUndead(lines: Field[]): Board | null {
  const params = find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? ''
  const shape = /^(\d+)x(\d+)/.exec(params)
  if (!shape) return null
  const w = Number(shape[1])
  const h = Number(shape[2])
  if (w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE) return null

  const parts = (find(lines, 'DESC') ?? '').split(',')
  if (parts.length !== 4 + 2 * (w + h)) return null
  const totals: Record<number, number> = {
    [GHOST]: Number(parts[0]),
    [VAMPIRE]: Number(parts[1]),
    [ZOMBIE]: Number(parts[2]),
  }
  if (MONSTERS.some((m) => !Number.isInteger(totals[m]) || totals[m] < 0)) return null
  const clues = parts.slice(4).map((text) => (text === '' ? -1 : Number(text)))
  if (clues.some((n) => !Number.isInteger(n))) return null

  const kind = new Array<string>((w + 2) * (h + 2)).fill('')
  const number = new Array<number>((w + 2) * (h + 2)).fill(-1)
  const clueOf: number[] = []
  let at = 0
  let squares = 0
  const place = (what: string, monster: number) => {
    if (at >= w * h) return false
    const x = (at % w) + 1
    const y = Math.floor(at / w) + 1
    kind[x + y * (w + 2)] = what
    if (what === '.') {
      number[x + y * (w + 2)] = squares
      clueOf[squares++] = monster
    }
    at += 1
    return true
  }
  for (const ch of parts[3]) {
    let ok = true
    if (ch === 'L' || ch === 'R') ok = place(ch, 0)
    else if (ch in FROM_LETTER) ok = place('.', FROM_LETTER[ch])
    else if (ch >= 'a' && ch <= 'z')
      for (let n = ch.charCodeAt(0) - 96; n > 0 && ok; n--) ok = place('.', 0)
    else return null
    if (!ok) return null
  }
  if (at !== w * h) return null
  if (MONSTERS.reduce((n, m) => n + totals[m], 0) !== squares) return null

  const sights: Sight[] = []
  const seen = new Set<number>()
  for (let i = 0; i < 2 * (w + h); i++) {
    if (seen.has(i)) continue
    let { x, y, dx, dy } = edge(i, w, h)
    const walk: number[] = []
    for (;;) {
      x += dx
      y += dy
      const out = edgeOf(x, y, w, h)
      if (out !== -1) {
        seen.add(out)
        sights.push({ walk, ends: [i, out] })
        break
      }
      const here = kind[x + y * (w + 2)]
      if (here === 'L') {
        walk.push(-1)
        ;[dx, dy] = dx === 0 ? [dy, 0] : [0, dx]
      } else if (here === 'R') {
        walk.push(-1)
        ;[dx, dy] = dx === 0 ? [-dy, 0] : [0, -dx]
      } else {
        walk.push(number[x + y * (w + 2)])
      }
      if (walk.length > 4 * w * h) return null
    }
  }

  return {
    squares,
    values: MONSTERS,
    clues: clueOf,
    groups: [],
    moves,
    narrow: (candidates, values) => {
      const cross = (square: number, keep: (m: number) => boolean) => {
        if (values[square]) return
        for (const m of [...candidates[square]]) if (!keep(m)) candidates[square].delete(m)
      }

      const placed: Record<number, number> = { [GHOST]: 0, [VAMPIRE]: 0, [ZOMBIE]: 0 }
      for (const m of values) if (m) placed[m] += 1
      for (const m of MONSTERS)
        if (placed[m] >= totals[m])
          for (let square = 0; square < squares; square++) cross(square, (mine) => mine !== m)

      for (const sight of sights) {
        for (const [walk, end] of [
          [sight.walk, sight.ends[0]],
          [[...sight.walk].reverse(), sight.ends[1]],
        ] as [number[], number][]) {
          const clue = clues[end]
          if (clue < 0) continue
          const weights = weigh(walk)

          let fixed = 0
          const open: [number, Record<number, number>][] = []
          for (const [square, weight] of weights) {
            if (values[square]) fixed += weight[values[square]]
            else open.push([square, weight])
          }
          // 视线上有「空着且零候选」的格子就整条线跳过:那只说明玩家已把棋盘弄
          // 矛盾,对线上其余格子什么都说明不了;不跳过 Math.min/max 会吃空数组
          // 得 ±Infinity,把候选成片清空。
          if (open.some(([square]) => candidates[square].size === 0)) continue

          const least = new Map<number, number>()
          const most = new Map<number, number>()
          let leastAll = 0
          let mostAll = 0
          for (const [square, weight] of open) {
            const each = [...candidates[square]].map((m) => weight[m])
            const low = Math.min(...each)
            const high = Math.max(...each)
            least.set(square, low)
            most.set(square, high)
            leastAll += low
            mostAll += high
          }

          for (const [square, weight] of open) {
            const restLeast = leastAll - least.get(square)!
            const restMost = mostAll - most.get(square)!
            cross(
              square,
              (m) =>
                fixed + weight[m] + restLeast <= clue && fixed + weight[m] + restMost >= clue,
            )
          }
        }
      }
    },
  }
}
