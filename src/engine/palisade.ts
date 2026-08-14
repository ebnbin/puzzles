import type { Drawn } from './renderer'

const WALL = 2
const MAYBE = 3
const NO = 4
const ERROR = 5

export type Border = 'wall' | 'no' | 'none'

export type Stand = { live: boolean; has: Border | null }

const OUT: Stand = { live: false, has: null }

export function readStand(tape: readonly Drawn[]): Stand | null {
  if (tape.length === 0) return null

  const box = tape.filter((d) => d.kind === 'poly' && d.points.length === 8).at(-1)
  if (!box || box.kind !== 'poly') return OUT

  const xs = box.points.filter((_, i) => i % 2 === 0)
  const ys = box.points.filter((_, i) => i % 2 === 1)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  if (x1 - x0 === y1 - y0) return OUT

  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const under = tape
    .filter(
      (d) =>
        d.kind === 'rect' &&
        (d.colour === WALL || d.colour === MAYBE || d.colour === NO || d.colour === ERROR) &&
        cx >= d.x &&
        cx <= d.x + d.w &&
        cy >= d.y &&
        cy <= d.y + d.h,
    )
    .at(-1)
  if (!under || under.kind !== 'rect') return { live: true, has: null }
  return {
    live: true,
    has: under.colour === NO ? 'no' : under.colour === MAYBE ? 'none' : 'wall',
  }
}
