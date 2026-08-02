/**
 * Where progress lives between visits.
 *
 * Each game has one save — the midend's own serialisation, byte-identical to
 * what the desktop builds write to a .sav file, rewritten after every move so
 * there is never a moment worth losing.
 *
 * Then three keys for the app itself. `recent` is the puzzle most recently
 * played and `playing` is whether the app was left inside it, which together
 * decide where a cold start lands. `scroll` is where the gallery was, and is
 * why coming back to it is coming back to the same place rather than to the top
 * of a list of forty.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SCREEN IS A BIT AND NOT A NAME
 * ---------------------------------------------------------------------------
 *
 * These two were `last` and `current`, both holding a game name: one the screen
 * to resume, one the tile to mark. They were written in the same effect from the
 * same value and only ever differed in that reaching the gallery deleted one of
 * them — so `last` was either absent or a copy of `current`, and all it carried
 * was one bit. Two keys that can hold different names but never do is a state
 * nothing produces and everything has to be written to survive: a cold start
 * resuming one puzzle while the gallery ringed another was reachable by editing
 * the store, and by any future change that wrote one without the other.
 *
 * So the name is stored once and the screen is a flag. Presence is the flag:
 * absent means the gallery, because absent is a state that exists anyway — a
 * fresh install, a cleared store — and writing a "false" as well would give one
 * meaning two spellings that every reader would have to accept regardless. What
 * is written is read back with `!!` and never compared to itself, so the value
 * can change without stranding anyone who stored the old one.
 *
 * Everything here shrugs off a blocked store — private browsing, quota — the
 * same way the preferences do: the app is fine, it just forgets.
 */

const PLAYING = 'puzzles.playing'
const RECENT = 'puzzles.recent'
const SCROLL = 'puzzles.scroll'
const save = (name: string) => `puzzles.save.${name}`

/** The first bytes of every genuine midend save. */
const MAGIC = 'SAVEFILE'

/**
 * How many positions a serialised game holds. One means the deal and nothing
 * since.
 *
 * The midend writes each field as a left-justified eight-character key, then
 * the length, then the value — `NSTATES :1:3` — so the padding is part of the
 * line. See the `wr` macro in midend.c.
 */
const STATES = /^NSTATES\s*:\d+:(\d+)$/m

/**
 * Whether anybody has moved in this game, as opposed to merely being dealt it.
 *
 * `midend_can_undo` is the wrong question and the app was effectively asking
 * it: it is true after a new game as well, because the midend keeps a separate
 * undo across deals so that dealing one can be taken back. That list is not
 * serialised, which is the tell — what is written down is `NSTATES`, the length
 * of the current game's own state list, and that is 1 for a board nobody has
 * touched. Restart appends a state rather than truncating to one, so a
 * restarted game counts as played and keeps its id, which is right: restarting
 * is a move, and an undoable one.
 *
 * A save this cannot read is kept. Being wrong in that direction costs a
 * needless write; being wrong in the other costs somebody their game.
 */
export function isPlayed(game: string): boolean {
  const found = STATES.exec(game)
  return found ? Number(found[1]) > 1 : true
}

export function readSave(name: string): string | null {
  try {
    const text = window.localStorage.getItem(save(name))
    return text?.startsWith(MAGIC) ? text : null
  } catch {
    return null
  }
}

export function writeSave(name: string, text: string): void {
  try {
    window.localStorage.setItem(save(name), text)
  } catch {
    // Full or blocked; playing on without a save is the fallback.
  }
}

export function clearSave(name: string): void {
  try {
    window.localStorage.removeItem(save(name))
  } catch {
    // Nothing to do about it.
  }
}

/**
 * Whether the app was left inside a puzzle rather than at the gallery.
 *
 * Read as presence, not as a value: anything stored is true. See the note at
 * the top for why there is no "false" to write.
 */
export function readPlaying(): boolean {
  try {
    return !!window.localStorage.getItem(PLAYING)
  } catch {
    return false
  }
}

export function setPlaying(playing: boolean): void {
  try {
    if (playing) window.localStorage.setItem(PLAYING, '1')
    else window.localStorage.removeItem(PLAYING)
  } catch {
    // See above.
  }
}

/**
 * The puzzle most recently played, which the gallery marks as the one you are
 * on.
 *
 * Outlives leaving it — the gallery still has to say which of the forty you
 * came off — so nothing deletes it. There is always a most recent puzzle once
 * there has been one, and whether you are still in it is `playing`.
 */
export function readRecent(): string | null {
  try {
    return window.localStorage.getItem(RECENT)
  } catch {
    return null
  }
}

export function writeRecent(name: string): void {
  try {
    window.localStorage.setItem(RECENT, name)
  } catch {
    // See above.
  }
}

/**
 * Where the gallery was scrolled to, or null if it has never said.
 *
 * Null is not zero: nothing remembered means the gallery has to guess where to
 * open, and the top is a poor guess when the puzzle you were on is in row ten.
 * A remembered zero is the top on purpose.
 */
export function readScroll(): number | null {
  try {
    const text = window.localStorage.getItem(SCROLL)
    if (text === null) return null
    const y = Number(text)
    return Number.isFinite(y) ? Math.max(0, y) : null
  } catch {
    return null
  }
}

export function writeScroll(y: number): void {
  try {
    window.localStorage.setItem(SCROLL, String(Math.round(y)))
  } catch {
    // See above.
  }
}
