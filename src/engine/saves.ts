/**
 * Where progress lives between visits.
 *
 * Each game has one save — the midend's own serialisation, byte-identical to
 * what the desktop builds write to a .sav file, rewritten after every move so
 * there is never a moment worth losing.
 *
 * Then four keys for the app itself. `recent` is the puzzle most recently
 * played and `playing` is whether the app was left inside it, which together
 * decide where a cold start lands. `scroll` is where the gallery was, and is
 * why coming back to it is coming back to the same place rather than to the top
 * of a list of forty. `introduced` is which puzzles have already introduced
 * themselves.
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
const INTRODUCED = 'puzzles.introduced'
const save = (name: string) => `puzzles.save.${name}`

/** The first bytes of every genuine midend save. */
const MAGIC = 'SAVEFILE'

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

/*
 * Which puzzles have introduced themselves.
 *
 * A set of names under one key rather than a key each, the way the put-away
 * games are kept: forty booleans that are only ever asked about together are
 * one fact, not forty.
 *
 * Held in memory as well, and that is not an optimisation. Where the store is
 * blocked the answer read back is always "no", so a puzzle left for the gallery
 * and opened again would introduce itself a second time, and a third. The
 * session's own copy is what stops that; it is seeded from the store the first
 * time anything asks.
 */
let introduced: Set<string> | null = null

function read(): Set<string> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(INTRODUCED) ?? '[]')
    return new Set(
      Array.isArray(stored) ? stored.filter((n) => typeof n === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

/**
 * Whether this puzzle still owes the reader its introduction — and, in the
 * saying, spends it. Asking is what uses it up, so there is no way to ask and
 * then forget to write it down, and no window in which a reload gets a second
 * one.
 */
export function takeIntroduction(name: string): boolean {
  introduced ??= read()
  if (introduced.has(name)) return false
  introduced.add(name)
  try {
    window.localStorage.setItem(INTRODUCED, JSON.stringify([...introduced]))
  } catch {
    // Blocked; the session's own copy still holds until the tab is closed.
  }
  return true
}
