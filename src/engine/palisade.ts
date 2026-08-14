/**
 * Where Palisade's cursor is standing, and what is already there, read off what
 * the board draws.
 *
 * ---------------------------------------------------------------------------
 * WHY IT HAS TO BE READ AT ALL
 * ---------------------------------------------------------------------------
 *
 * Palisade is one of two back ends with no `current_key_label` at all
 * (palisade.c:1565), so the usual channel — "what would this key do right now"
 * — says nothing, ever. That is why its two buttons were live for the whole
 * game. They should not be: its cursor walks a half-grid where only half the
 * stops are borders, and on a square's centre or corner both keys return
 * `MOVE_NO_EFFECT` (palisade.c:1077). Every other step is a dead press.
 *
 * The other thing missing is what the border under the cursor already carries —
 * a wall, a "no wall" mark, or nothing — which is what tells a switch which way
 * it is set, and which lets one press replace the other mark instead of two.
 *
 * ---------------------------------------------------------------------------
 * BOTH ARE IN ONE FRAME, AND NEITHER NEEDS ANY GEOMETRY
 * ---------------------------------------------------------------------------
 *
 * The cursor is drawn as a rectangle outline whose *shape* is which kind of
 * stop it is (palisade.c:1293-1298): a third of a tile by two thirds on a
 * vertical border, two thirds by a third on a horizontal one, and square on a
 * corner or a centre. So "can these keys act" is `w !== h` — no tile size, no
 * margin, no theme, nothing this side has to work out. The map lesson, which
 * cost a rewrite: ask the drawing, do not recompute the geometry.
 *
 * What the border holds is in the same frame and in the same spirit. Each tile
 * paints its four borders in a colour that *is* the state (palisade.c:1228):
 * `COL_LINE_YES` (which is `COL_GRID`) for a wall, `COL_LINE_NO` for the mark,
 * `COL_LINE_MAYBE` for nothing yet. The tape carries the colour *number* the
 * game asked for, one step before the theme touches it, so this is reading what
 * the game said rather than what it looks like. The border wanted is the one
 * the cursor outline is centred on — a containment test between two shapes in
 * one frame, so again no coordinates are computed here.
 *
 * The tile under the cursor is always in the frame, which is what makes this
 * work: "the cursor is on me" is part of a tile's draw flags
 * (palisade.c:1371-1376), so the tiles it enters and leaves are both redrawn on
 * every step.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT COSTS WHEN IT IS WRONG
 * ---------------------------------------------------------------------------
 *
 * A missed read answers null and the row behaves as it did before this existed:
 * both keys live, which is upstream's own behaviour with the labels it does not
 * have. An empty frame is not a read at all — a press that changes nothing
 * draws nothing — so the caller keeps the last answer, which is still true
 * because nothing moved.
 *
 * `scripts/check-palisade.mjs` is what keeps this honest across an upstream
 * bump: it walks the cursor over every stop of a board and compares this
 * reading against what the engine actually does with a press.
 */
import type { Drawn } from './renderer'

/** palisade.c's colour numbers, in its own order (palisade.c:1162-1173). */
const WALL = 2 // COL_GRID, which is also COL_LINE_YES
const MAYBE = 3 // COL_LINE_MAYBE, drawn where nothing has been decided
const NO = 4 // COL_LINE_NO, the reader's "no wall here"
const ERROR = 5 // a wall that breaks a clue: still a wall

/** What a border carries. */
export type Border = 'wall' | 'no' | 'none'

/**
 * The cursor's stop. `live` is false on a corner, a centre, and a cursor that
 * is not on screen — three states the keys treat alike, since none of them is
 * somewhere a press can act.
 */
export type Stand = { live: boolean; has: Border | null }

const OUT: Stand = { live: false, has: null }

/**
 * Read one recorded frame, or null if it says nothing.
 *
 * Null and `OUT` are different answers on purpose: null means "this frame was
 * not a redraw", and the caller keeps what it had.
 */
export function readStand(tape: readonly Drawn[]): Stand | null {
  if (tape.length === 0) return null

  // The outline, which is the only polygon this puzzle draws on screen — its
  // borders and tiles are rectangles and its clues are text. Drawn last, after
  // every tile, and with no fill, which is how `draw_rect_outline` asks for one
  // (misc.c:325). A frame without it is a frame drawn while the cursor was
  // hidden, which a press on the board does (palisade.c:989).
  const box = tape.filter((d) => d.kind === 'poly' && d.points.length === 8).at(-1)
  if (!box || box.kind !== 'poly') return OUT

  const xs = box.points.filter((_, i) => i % 2 === 0)
  const ys = box.points.filter((_, i) => i % 2 === 1)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  // A corner and a centre are both square; the two borders are the two ways of
  // being oblong. Which of them it is does not matter to a button — both are a
  // border, and the key acts the same on either.
  if (x1 - x0 === y1 - y0) return OUT

  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  // Every border is drawn twice, once by the tile on each side (palisade.c
  // says so at 1382), and the two agree; the last one painted is the one on
  // screen, so it is the one to believe.
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
