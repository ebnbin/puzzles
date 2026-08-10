/**
 * What is in the square under Tents' cursor, which is the one thing its two
 * switches need and the one thing the back end will not say.
 *
 * `current_key_label` answers "Clear" for a tent and "Clear" for a green square
 * alike (tents.c:1485-1486), and upstream blanks the first word when both keys
 * agree, so what arrives here is {"", "Clear"} for both. A pair of switches has
 * to tell them apart: standing on grass, the tent key plants a tent; standing
 * on a tent, it clears. Same words, opposite presses.
 *
 * So this reads the save file, which is the other door into the back end and
 * the only one that can answer. It uses the cheap half of it: nothing is
 * written and nothing is loaded, so the `game_ui` is not rebuilt, the cursor is
 * not lost and a completed board still flashes. Tents was briefly the third
 * user of that door and used only this half; this is that idea again, arrived
 * at from the other end.
 *
 * Reading rather than remembering, because a copy of the board could not
 * survive a press on the board: Tents drags, and a drag paints a whole row in
 * one gesture. The moves are the truth and they are already written down.
 */
import type { Spot } from './map'
import { fields, find } from './marks/save'

/** What a square holds. `B` is upstream's letter for an empty one. */
export type Square = 'T' | 'N' | 'B'

/**
 * The board's width and height, off the game id.
 *
 * Tents' params are `<w>x<h>` and then a difficulty letter (`decode_params`),
 * so the two numbers are the whole of what has to be read, and anything that
 * does not start that way is a description this side does not know.
 */
export function tentsGrid(params: string): { w: number; h: number } | null {
  const m = /^(\d+)x(\d+)/.exec(params)
  if (!m) return null
  const w = +m[1]
  const h = +m[2]
  return w > 0 && h > 0 ? { w, h } : null
}

/** One `T3,4` / `N3,4` / `B3,4`, which is every move this puzzle makes. */
const PLACE = /^([TNB])(\d+),(\d+)$/

/**
 * The squares a save file has written to, as a map from "x,y" to its letter.
 *
 * Only the squares that were written: a square nobody has touched is blank, and
 * so is a tree — the difference does not matter here, because upstream reports
 * no words at all on a tree (its switch covers BLANK, TENT and NONTENT and lets
 * TREE fall out, tents.c:1482) and both keys are already out there.
 *
 * Null when anything in the file is not understood, which stands the switches
 * down rather than guessing at them. The bargain is `engine/marks`': a wrong
 * guess here plants a tent where the reader asked for grass, and doing nothing
 * is cheaper than that by a wide margin.
 */
function written(save: string): Map<string, Square> | null {
  const lines = fields(save)
  if (!lines) return null
  const at = Number(find(lines, 'STATEPOS'))
  if (!Number.isInteger(at) || at < 1) return null
  const grid = new Map<string, Square>()
  let played = 0
  for (const f of lines) {
    if (f.key !== 'MOVE' && f.key !== 'SOLVE' && f.key !== 'RESTART') continue
    // STATEPOS counts states and the deal is the first, so the moves that have
    // actually been applied are the ones before it. The rest are the redo tail.
    if (++played >= at) break
    if (f.key === 'RESTART') {
      // Back to the deal, which is every square blank. The trees are in the
      // description and never move, and they are not this function's business.
      grid.clear()
      continue
    }
    // Solve throws the board away and states the answer: `S` and then a tent
    // per square that has one (tents.c:1374-1380).
    const parts = f.value.split(';')
    if (f.key === 'SOLVE') {
      if (parts[0] !== 'S') return null
      grid.clear()
      parts.shift()
    }
    for (const part of parts) {
      const m = PLACE.exec(part)
      if (!m) return null
      grid.set(`${m[2]},${m[3]}`, m[1] as Square)
    }
  }
  return grid
}

/** What is in one square, or null if the file could not be read. */
export function squareAt(save: string, at: Spot): Square | null {
  const grid = written(save)
  return grid && (grid.get(`${at.x},${at.y}`) ?? 'B')
}
