/**
 * Map's palette: four colours a key can name, where upstream has none.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NOTHING TO NAME A COLOUR WITH
 * ---------------------------------------------------------------------------
 *
 * Map's drag is not "choose red", it is "make this region the same as that
 * one". `ui->drag_colour` becomes a colour in exactly two places — the cursor
 * picking one up (map.c:2521) and the mouse picking one up (map.c:2542) — and
 * both read it off a region already on the board. The board is the palette and
 * there is no other, which is why no key, and no sequence of keys, means red.
 *
 * That reads fine with a mouse, where the source region is wherever you happen
 * to be pointing. With arrow keys it is a journey. Measured over ten deals: the
 * nearest region carrying a given colour is 5.6 cursor steps away on average,
 * before walking back to the region you meant to fill. A default board is
 * twenty by fifteen with thirty regions, thirteen of them given, so seventeen
 * fills are what a game costs.
 *
 * Four buttons say it in one press. They go through the save file, which is the
 * door engine/marks opened and this is the second thing to use — with one
 * difference that shapes everything below: a mark key acts on a board it can
 * read, and this acts on the region under the cursor, which it cannot.
 *
 * ---------------------------------------------------------------------------
 * THE GEOMETRY IS ASKED FOR, NOT WORKED OUT. THIS WAS THE SECOND ATTEMPT
 * ---------------------------------------------------------------------------
 *
 * The obvious way is to rewrite map.c's geometry here: `parse_edge_list`
 * (map.c:1721) is a run-length encoded wall list through a disjoint set forest,
 * region numbers handed out in scan order, forty lines of it. That was written,
 * and it was wrong, and the way it was wrong is worth keeping.
 *
 * `new_game` copies the parsed grid over all four of `map->map`'s quadrants
 * (map.c:1884) — so far so good, and it looked as though the `EPSILON`/quadrant
 * machinery could be ignored. But the next paragraph (map.c:1908) walks the
 * board again and turns some squares into *diagonally divided* ones, writing
 * four different regions into one square's quadrants, including the quadrant
 * the parser filled. Which squares get divided depends on the order they are
 * visited in, and that order is `shuffle` over `random_new(desc, strlen(desc))`
 * — upstream's SHA-1 generator. Reproducing it means porting that.
 *
 * The damage was small and would have stayed hidden: two to four squares a
 * board, about one percent, measured by asking the engine about all three
 * hundred cells on each of three deals. A palette that paints the wrong region
 * one press in a hundred is worse than one that does not exist.
 *
 * So nothing here works out which region a cell is in. The engine is asked, by
 * being made to play a move and say where it landed:
 *
 *   1. Give every region a colour through the save file, and load it. A move
 *      names a region by number and the numbers are 0 to n-1, so writing that
 *      needs no geometry — it is the one thing about a board that can be said
 *      without knowing its shape.
 *   2. Walk the cursor back to where the reader left it, and press the select
 *      key twice. That is upstream's own "empty this region" (map.c:2532).
 *   3. The engine writes `C:<region>`, and that number came from map.c and from
 *      nowhere else.
 *   4. Throw the probe away, and put the real move on the original save.
 *
 * Two loads and two walks per press, and no model of upstream to drift. The
 * only thing left on this side is the clue list, which is indexed by region and
 * needs no geometry: digits colour consecutive regions, letters skip
 * (map.c:1894). Reading it is not optional — `execute_move` checks only that
 * the region number is in range (map.c:2638) and will overwrite a clue where
 * `interpret_move` refuses one (map.c:2588).
 *
 * ---------------------------------------------------------------------------
 * THE CURSOR, WHICH IS THE OTHER HALF
 * ---------------------------------------------------------------------------
 *
 * Map's `encode_ui` is NULL (map.c:3347), so where the cursor is cannot be read
 * out of a save. PuzzleHost keeps a copy — see `stepCursor`, which is all the
 * arithmetic that copy needs.
 *
 * The copy is re-anchored constantly rather than trusted: `midend_deserialise`
 * builds a fresh `game_ui` (midend.c:2623) and only restores it for a game with
 * `decode_ui`, which Map has not. So every load here puts the cursor back at
 * the origin, and every walk starts from a position nobody has to be told.
 * Drift would have to happen inside one stretch of arrow keys, and every key
 * that reaches the back end passes through PuzzleHost's `onKeyDown`.
 *
 * Read nothing you are not sure of: parameters that do not match, a clue list
 * that does not add up, a move nobody here wrote — any of them and the key does
 * nothing. Same bargain as engine/marks, and the same silence, because a reader
 * can act on none of it.
 */
import { done, extend, fields, find, line, pending } from './marks/save'
import type { Drawn } from './renderer'
import type { PuzzleApi } from './types'

/** Upstream's, and fixed: `FOUR` is 4 and map.c:1301 asserts it at compile time. */
export const COLOURS = 4

/** A cursor cell. Not a region — several cells share one, and the palette
 *  never needs to know which. */
export type Spot = { x: number; y: number }

/** What a key puts in the region under the cursor. -1 empties it. */
export type Paint = { colour: number; pencil?: boolean }

/**
 * The grid, from the parameters the midend writes into the save.
 *
 * `<w>x<h>n<n>` and then the difficulty, which is nothing to do with us. Read
 * strictly: an id we do not recognise is a board we would be guessing at.
 */
export function mapSize(params: string) {
  const m = /^(\d+)x(\d+)n(\d+)/.exec(params)
  if (!m) return null
  const [w, h, n] = [+m[1], +m[2], +m[3]]
  return w > 0 && h > 0 && n > 0 && n <= w * h ? { w, h, n } : null
}

/**
 * One arrow, applied to the copy of the cursor.
 *
 * `move_cursor` is handed `wrap = false` (map.c:2506), so the cursor stops at
 * the edges rather than coming round; and nothing else in `interpret_move`
 * touches `cur_x`/`cur_y`. A press on the board hides the cursor (map.c:2552)
 * but leaves it where it was, and undo and redo do not reach the ui at all, so
 * this is the whole of what moves it.
 */
export function stepCursor(at: Spot, key: string, grid: { w: number; h: number }): Spot {
  const { x, y } = at
  switch (key) {
    case 'ArrowLeft': return { x: Math.max(x - 1, 0), y }
    case 'ArrowRight': return { x: Math.min(x + 1, grid.w - 1), y }
    case 'ArrowUp': return { x, y: Math.max(y - 1, 0) }
    case 'ArrowDown': return { x, y: Math.min(y + 1, grid.h - 1) }
    default: return at
  }
}

/** The clues, by region number. No geometry: this list is indexed the way a
 *  move is. */
function clues(n: number, desc: string) {
  const list = desc.split(',')[1]
  if (list === undefined) return null
  const colour = new Array<number>(n).fill(-1)
  const given = new Array<boolean>(n).fill(false)
  let r = 0
  for (const ch of list) {
    if (ch >= '0' && ch < String.fromCharCode(48 + COLOURS)) {
      if (r >= n) return null
      colour[r] = +ch
      given[r] = true
      r++
    } else if (ch >= 'a' && ch <= 'z') r += ch.charCodeAt(0) - 96
    else return null
  }
  return r === n ? { colour, given } : null
}

/**
 * Where every region stands, from the moves so far.
 *
 * The move language is `<c>:<r>` for a colour and `p<c>:<r>` for one bit of a
 * stipple, `C` standing for none of them, several joined by semicolons. A
 * colour also clears the stipple under it (map.c:2653), which is why one Clear
 * key is enough to take a region back to nothing.
 *
 * `RESTART` is replayed rather than refused, the same as in engine/marks: it is
 * a state in the history, and refusing it would kill the keys for the rest of
 * the deal. Its string is the description, so replaying it is starting over.
 * `S` stays shut — the solver's answer arrives as a whole board in one move,
 * and a board we did not follow is one we should not write to.
 */
function replay(moves: { key: string; value: string }[], start: ReturnType<typeof clues>, desc: string) {
  if (!start) return null
  const colour = [...start.colour]
  const pencil = new Array<number>(colour.length).fill(0)
  for (const move of moves) {
    if (move.key === 'RESTART') {
      if (move.value !== desc) return null
      for (let r = 0; r < colour.length; r++) { colour[r] = start.colour[r]; pencil[r] = 0 }
      continue
    }
    if (move.key === 'SOLVE') return null
    for (const step of move.value.split(';')) {
      const m = /^(p?)(C|[0-9]):(\d+)$/.exec(step)
      if (!m) return null
      const r = +m[3]
      const c = m[2] === 'C' ? -1 : +m[2]
      if (r >= colour.length || c >= COLOURS) return null
      if (m[1]) {
        if (c < 0) pencil[r] = 0
        else pencil[r] ^= 1 << c
      } else {
        colour[r] = c
        pencil[r] = 0
      }
    }
  }
  return { colour, pencil }
}

/** A move string, or null where upstream would have played nothing. */
const wording = (paint: Paint, at: { colour: number; pencil: number }, r: number) => {
  if (paint.pencil) {
    // A stipple on a coloured region is refused upstream (map.c:2595), so it is
    // refused here. Everywhere else the bit turns over, which is one dot on the
    // board appearing or going out.
    if (at.colour >= 0 || paint.colour < 0) return null
    return `p${paint.colour}:${r}`
  }
  if (at.colour === paint.colour && (paint.colour >= 0 || at.pencil === 0)) return null
  return `${paint.colour < 0 ? 'C' : paint.colour}:${r}`
}

/**
 * Paint the region under the cursor, and leave the cursor where it was.
 *
 * Takes the running back end rather than a save string, unlike engine/marks:
 * finding the region *is* asking the engine, so there is nothing here that
 * could be a pure function of the save. Everything happens inside one call, so
 * the browser composites once and the two probe positions are never seen.
 */
export function paintRegion(api: PuzzleApi, at: Spot, paint: Paint): void {
  const orig = api.saveGame()
  const lines = fields(orig)
  if (!lines) return
  const params = find(lines, 'PARAMS')
  const desc = find(lines, 'DESC')
  const kept = done(lines)
  if (params === undefined || desc === undefined || !kept) return
  const grid = mapSize(params)
  if (!grid) return
  const start = clues(grid.n, desc)
  const stood = replay(kept, start, desc)
  if (!start || !stood) return

  const key = (k: string) => api.key(0, k, '', 0, 0, 0)
  /*
   * Out to a cell, from the origin a fresh `game_ui` leaves the cursor at.
   * Left first because it is what reveals the cursor without moving it —
   * `move_cursor` clamps and there is nowhere to the left of zero.
   */
  const walk = (to: Spot) => {
    key('ArrowLeft')
    for (let i = 0; i < to.x; i++) key('ArrowRight')
    for (let i = 0; i < to.y; i++) key('ArrowDown')
  }
  const restore = () => { api.loadGame(orig); walk(at) }

  /*
   * Which region the cursor is on, asked of the engine.
   *
   * Every region is given a colour first — one move string, `0:0;0:1;…`, which
   * needs no geometry at all since a move names a region by number and the
   * numbers are 0 to n-1. Then a select key pressed twice without moving is
   * upstream's own "empty this region": the first picks the colour up, and the
   * second finds `cur_moved` false, turns what it is holding into nothing
   * (map.c:2532) and puts it down. That plays `C:<region>`, and the region
   * number in it came from map.c and from nowhere else.
   *
   * Colouring everything first is what makes the one probe enough. A drop that
   * changes nothing plays nothing, so a probe against a board as it stands would
   * go silent exactly where the region already held what was being dropped —
   * and worst of all where the cursor was standing on the region the colour was
   * picked up from, which is a hole with no bottom. Against a board where every
   * region has a colour, clearing always changes something.
   *
   * So silence has one meaning left, and it is the one we want: `drag_dropped`
   * returns without a move for a clue and for nothing else (map.c:2588). The
   * probe answers "which region" and "may I write to it" in the same press.
   */
  let region: number | null = null
  const paint0 = Array.from({ length: grid.n }, (_, r) => `0:${r}`).join(';')
  api.loadGame(extend(lines, kept, [paint0]) ?? orig)
  walk(at)
  key('Enter')                         // pick up what is under the cursor
  key('Enter')                         // and put nothing down in its place
  const played = done(fields(api.saveGame()) ?? [])
  if (played && played.length > kept.length + 1) {
    const m = /^C:(\d+)$/.exec(played[played.length - 1].value)
    if (m) region = +m[1]
  }
  if (region === null || region >= grid.n || start.given[region]) return restore()

  const move = wording(paint, { colour: stood.colour[region], pencil: stood.pencil[region] }, region)
  if (!move) return restore()
  const next = extend(lines, kept, [move])
  if (!next) return restore()
  // Held back and pressed home with redo(), so that a map finished by a key
  // flashes like one finished by hand. See `pending`.
  const held = pending(next)
  api.loadGame(held ?? next)
  if (held) api.redo()
  walk(at)
}

/* ===========================================================================
 * WHICH SQUARES BELONG TO A CLUE
 * ===========================================================================
 *
 * The palette acts on the region under the cursor, and about a third of the
 * regions on a board are clues that no press can change. Standing on one, the
 * four swatches were live and the press did nothing — the exact thing the
 * house rule dims for, and the reason it went unfixed is that "which region is
 * the cursor on" is the question this whole file exists because it cannot
 * answer cheaply.
 *
 * It turns out not to be the question. What the palette needs is not the region
 * number but whether that region is a clue, and at the moment a board is dealt
 * those two facts are the same fact:
 *
 *     for (i = 0; i < n; i++) state->colouring[i] = -1;
 *     for (i = 0; i < n; i++) state->map->immutable[i] = false;
 *     ...
 *     state->colouring[pos] = *p - '0';
 *     state->map->immutable[pos] = true;      // map.c:1896-1897, two lines
 *
 * Nothing is coloured except the clues, and every clue is coloured. So a square
 * that is painted at the deal is a clue square and one left as background is
 * not, and that is a picture — which the board draws, and which the renderer is
 * handed one call at a time.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS READ, AND WHY IT IS NOT "READING PIXELS"
 * ---------------------------------------------------------------------------
 *
 * `draw_square` (map.c) paints a square with at most two calls: a full-tile
 * `draw_rect` in the top region's colour, and — only where the square is
 * diagonally divided — a three-point `draw_polygon` in the bottom region's.
 * Both arrive at CanvasRenderer carrying the *colour slot map.c asked for*, so
 * what is read here is what the game said, one step before the theme turns it
 * into pixels.
 *
 * Measured on a default board, 20x15 with 30 regions: 615 rects, 37 polygons.
 * So 37 of 300 squares are divided, and the other 263 are one flat colour.
 *
 * The triangle also says which way the square is cut, and it says it in the
 * only place it could: upstream picks the third point by `map[LE] == map[TE]`,
 * so a triangle whose apex is on the right means the left quadrant goes with
 * the top one, and an apex on the left means it goes with the bottom.
 *
 * ---------------------------------------------------------------------------
 * AND THE QUADRANT, WHICH IS WHERE THE FIRST ATTEMPT AT THIS DIED
 * ---------------------------------------------------------------------------
 *
 * The cursor does not stand on a square, it stands on a *quadrant* of one:
 *
 *     quadrant = 2 * (x_eps > y_eps) + (-x_eps > y_eps);      // map.c:2455
 *     quadrant = quadrant == 0 ? BE : quadrant == 1 ? LE : quadrant == 2 ? RE : TE;
 *     return state->map->map[quadrant * wh + ty*w+tx];
 *
 * where the epsilons come from the direction of the last arrow. That direction
 * is not part of the board and does not belong in this table — it is part of
 * the *question*, and the arithmetic that turns it into a quadrant is six lines
 * with no randomness and nothing about the board in it. Which is exactly what
 * separates it from the geometry at the top of this file: region assignment is
 * generated by a shuffle over upstream's SHA-1 and cannot be ported; quadrant
 * selection is a comparison of two small integers and can be copied verbatim.
 */

/** Upstream's, for `COL_0 + colour`; slot 0 is the ground a plain square shows. */
const COL_BACKGROUND = 0

/**
 * A dealt board, as far as the palette needs to know it: for each square,
 * whether each side of it belongs to a clue.
 *
 * `top` and `bottom` are the two regions upstream draws a square with, and
 * `apexRight` is its answer to `map[LE] == map[TE]` — which of them the left
 * and right quadrants go with. An undivided square has `top === bottom` and
 * the flag means nothing.
 */
export type Clues = {
  w: number
  h: number
  top: Uint8Array
  bottom: Uint8Array
  apexRight: Uint8Array
}

/**
 * Read a dealt board out of one redraw.
 *
 * The board has to *be* dealt to be read, so this winds the save back to its
 * first state, redraws, and winds it forward again. Both loads happen in one
 * go with no await between them, which is what keeps it invisible: the canvas
 * is written twice before the browser paints once.
 *
 * Null on anything unexpected — a save that will not parse, a redraw that does
 * not produce one full tile per square. The palette then behaves as it did
 * before this existed, which is live everywhere and inert on clues.
 */
export function readClues(
  api: PuzzleApi,
  renderer: { record(): void; stop(): Drawn[] },
  grid: { w: number; h: number },
): Clues | null {
  const save = api.saveGame()
  const lines = fields(save)
  if (!lines) return null
  const dealt = lines
    .map((f) => line(f.key, f.key === 'STATEPOS' ? '1' : f.value))
    .join('')

  renderer.record()
  let tape: Drawn[]
  try {
    api.loadGame(dealt)
  } finally {
    tape = renderer.stop()
    api.loadGame(save)
  }
  return readTape(tape, grid)
}

/**
 * The tape, turned into the table. Split out because it is the half worth
 * testing without a browser in the way.
 *
 * The tile size and the board's origin are taken from the shapes rather than
 * recomputed from `TILESIZE` and `BORDER`: the drawing already contains them,
 * and a square tile repeated w*h times is not a thing anything else on this
 * board looks like.
 */
export function readTape(tape: Drawn[], grid: { w: number; h: number }): Clues | null {
  const { w, h } = grid
  const squares = new Map<number, Drawn & { kind: 'rect' }>()
  const sizes = new Map<number, number>()
  for (const d of tape)
    if (d.kind === 'rect' && d.w === d.h && d.w > 2)
      sizes.set(d.w, (sizes.get(d.w) ?? 0) + 1)
  let tile = 0
  for (const [size, count] of sizes) if (count >= w * h && (!tile || size < tile)) tile = size
  if (!tile) return null

  let ox = Infinity
  let oy = Infinity
  for (const d of tape)
    if (d.kind === 'rect' && d.w === tile && d.h === tile) {
      ox = Math.min(ox, d.x)
      oy = Math.min(oy, d.y)
    }
  const cell = (x: number, y: number) => {
    const cx = Math.round((x - ox) / tile)
    const cy = Math.round((y - oy) / tile)
    return cx >= 0 && cx < w && cy >= 0 && cy < h ? cy * w + cx : -1
  }

  for (const d of tape)
    if (d.kind === 'rect' && d.w === tile && d.h === tile) {
      const i = cell(d.x, d.y)
      if (i >= 0) squares.set(i, d)
    }
  if (squares.size !== w * h) return null

  const top = new Uint8Array(w * h)
  const bottom = new Uint8Array(w * h)
  const apexRight = new Uint8Array(w * h)
  for (const [i, d] of squares) {
    const clue = d.colour !== COL_BACKGROUND ? 1 : 0
    top[i] = clue
    bottom[i] = clue
  }
  // The triangles, which are drawn a pixel outside their tile, so they are
  // placed by the middle of their own bounding box rather than by a corner.
  for (const d of tape) {
    if (d.kind !== 'poly' || d.points.length !== 6) continue
    const xs = [d.points[0], d.points[2], d.points[4]]
    const ys = [d.points[1], d.points[3], d.points[5]]
    const i = cell(
      (Math.min(...xs) + Math.max(...xs)) / 2 - tile / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2 - tile / 2,
    )
    if (i < 0) continue
    bottom[i] = d.colour !== COL_BACKGROUND ? 1 : 0
    // coords[2] is the apex: upstream sets it to the right edge when the left
    // quadrant belongs with the top one (map.c's draw_square).
    apexRight[i] = d.points[2] > (Math.min(...xs) + Math.max(...xs)) / 2 ? 1 : 0
  }
  return { w, h, top, bottom, apexRight }
}

/**
 * Whether the square the cursor is on is a clue, given the arrow that took it
 * there. `dir` is empty before any arrow has been pressed, which upstream
 * treats as the bottom quadrant.
 *
 * The quadrant arithmetic is map.c:2455 transcribed: right and left pick the
 * side quadrants, down and up the bottom and top ones, and nothing picks the
 * one it came from.
 */
export function clueAt(clues: Clues, at: Spot, dir: string): boolean {
  const i = at.y * clues.w + at.x
  if (i < 0 || i >= clues.top.length) return false
  const quadrant =
    dir === 'ArrowUp' ? 'TE' :
    dir === 'ArrowDown' ? 'BE' :
    dir === 'ArrowLeft' ? 'LE' :
    dir === 'ArrowRight' ? 'RE' : 'BE'
  const withTop =
    quadrant === 'TE' ? true :
    quadrant === 'BE' ? false :
    quadrant === 'LE' ? clues.apexRight[i] === 1 : clues.apexRight[i] === 0
  return (withTop ? clues.top[i] : clues.bottom[i]) === 1
}
