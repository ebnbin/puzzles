/**
 * Tents' two toggles: a key that sets a square, and empties it when the square
 * already holds what the key sets.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS CANNOT BE DECIDED FROM THE LABELS
 * ---------------------------------------------------------------------------
 *
 * Two buttons, each one a switch for its own value, and each able to overwrite
 * the other's: tent on a green square is a tent, green on a tent is green,
 * either one on what it already put there is empty. That is three outcomes per
 * button and upstream has the keys for all three — `T`, `N` and `B` set the
 * square outright (tents.c:1706) — so the only question is which to send.
 *
 * The label channel cannot answer it. `current_key_label` returns "Tent" and
 * "Green" on an empty square and "Clear" from *both* keys on a full one
 * (tents.c:1482), so it tells empty from full and stops there. Nothing else the
 * back end says distinguishes a tent from grass: `interpret_move`'s own two
 * keys collapse them the same way (`v == BLANK ? 'T' : 'B'`), and no single key
 * press branches on which of the two is there.
 *
 * ---------------------------------------------------------------------------
 * SO THE PRESS ASKS THE QUESTION ITSELF
 * ---------------------------------------------------------------------------
 *
 * The save file knows, because every move upstream has ever made is in it and
 * its grammar is four lines long: `S` sets every non-tree square to grass, and
 * `T`/`N`/`B` set one square each, joined by `;` (tents.c:1730). What is in a
 * square is the last step that touched it, and that is a backward walk over the
 * move list rather than a board to be rebuilt.
 *
 * What the save does *not* hold is `ui->cx, ui->cy` — tents has no `encode_ui`,
 * so the cursor is nowhere in the file and this side would have to keep a copy.
 * It does not. It presses first and reads the coordinates out of the move the
 * engine just wrote, which is Map's trick (`engine/map.ts`) with the probe left
 * out: the press we would have made anyway *is* the probe.
 *
 *   1. Send the key. The square now holds this button's value, whatever it held
 *      before, and the save gains `T<x>,<y>` — the cursor, said by the engine.
 *   2. Walk the earlier moves backwards for the last step at that square.
 *   3. If it was already this button's value, the press changed nothing: undo
 *      it and send `B` instead.
 *
 * Step 3 costs an extra pair of midend calls and buys back the undo step. The
 * no-op move is real — there is no MOVE_NO_EFFECT on this path, so `execute_move`
 * writes the same value again and the midend pushes a state — and `midend_undo`
 * followed by a move purges it (`midend_purge_states`), so the history gains
 * exactly one step per press either way. Measured: 5 moves to 6 with no undo, 5
 * to 6 with it.
 *
 * The two-thirds case pays nothing. Setting an empty square, or overwriting the
 * other value, is one key and one state, and the read that follows only
 * confirms it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REFUSES, AND WHY THAT IS THE SAFE DIRECTION
 * ---------------------------------------------------------------------------
 *
 * A save it cannot read, a move whose syntax is not one of the four, a last
 * move that is not the key we just sent: all of them answer "not this button's
 * value", so the toggle simply does not fire and the press stands as a plain
 * set. That is the behaviour these buttons had before the switch existed —
 * never wrong, only less clever — where a guess would clear a square the reader
 * had just filled. Same trade as engine/marks: reading the board wrong is worse
 * than not reading it.
 */
import { done, fields, find } from './marks/save'
import type { Field } from './marks/save'
import type { PuzzleApi } from './types'

/** Upstream's own letters for what a square holds. `B` is an empty one. */
export type Held = 'T' | 'N' | 'B'

/** One step of a move: a letter and a square. The whole grammar bar `S`. */
const STEP = /^([TNB])(\d+),(\d+)$/

/**
 * What the square touched by the last move held *before* it, or null when the
 * save does not read as one, or the last move is not `sent` at a single square.
 *
 * That last guard is what makes this safe to call straight after a press: it
 * proves the move being measured is ours. A button whose labels have gone stale
 * could in principle fire on a square the back end refuses, leaving somebody
 * else's move on the end of the list, and the answer would then be about the
 * wrong square.
 */
export function heldBefore(save: string, sent: string): Held | null {
  const lines = fields(save)
  if (!lines) return null
  const moves = done(lines)
  if (!moves || moves.length === 0) return null
  const ours = moves[moves.length - 1].value.match(STEP)
  if (!ours || ours[1] !== sent) return null
  const at = `${ours[2]},${ours[3]}`

  for (let i = moves.length - 2; i >= 0; i--) {
    const move = moves[i]
    // A restart is a state like any other and puts the board back to the deal,
    // so everything before it is answered by the description instead.
    if (move.key === 'RESTART') break
    const steps = move.value.split(';')
    for (let j = steps.length - 1; j >= 0; j--) {
      // The solver's move greens every non-tree square first and fills its
      // tents in over the top (tents.c:1739). Its steps come after it in the
      // string, so a walk that reaches the `S` has already passed them.
      if (steps[j] === 'S') return 'N'
      const step = steps[j].match(STEP)
      if (!step) return null
      if (`${step[2]},${step[3]}` === at) return step[1] as Held
    }
  }
  return dealt(lines)
}

/**
 * What the deal put in a square that no move has touched: nothing.
 *
 * True of every board this app can generate — a description is runs of empty
 * squares each ended by a tree (tents.c:1270), and a tree is not a square these
 * buttons work on. The two characters that would make it false are `!` and `-`,
 * a tent and a green square written into the description itself, and they can
 * only arrive in a game ID somebody typed in by hand.
 *
 * Those are refused rather than read, and not for the effort: their run length
 * is -1, so each one steps *back* and overwrites the square before it rather
 * than placing one of its own. Transcribing that correctly is a third parser to
 * keep in step with upstream, in exchange for the toggle working on a square
 * that was pre-filled by hand and never touched since. It is not worth being
 * wrong about, and refusing costs only that the first press there sets rather
 * than clears.
 */
function dealt(lines: Field[]): Held | null {
  const desc = find(lines, 'DESC')
  if (desc === undefined) return null
  return /[!-]/.test(desc) ? null : 'B'
}

/**
 * Put this button's value in the square under the cursor, or empty the square
 * if it is already there.
 *
 * `value` is the key that sets it — `T` or `N` — and it goes out first, because
 * where the cursor is standing is only knowable from a move that has been made.
 */
export function setOrClear(api: PuzzleApi, value: string): void {
  api.key(0, value, '', 0, 0, 0)
  if (heldBefore(api.saveGame(), value) !== value) return
  api.undo()
  api.key(0, 'B', '', 0, 0, 0)
}
