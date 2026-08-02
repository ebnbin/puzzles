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

/**
 * Nothing more is to be written.
 *
 * Set by `forgetEverything`, which clears the store and then reloads — and the
 * reload is what makes this necessary. Unloading the document fires `pagehide`,
 * the gallery writes its scroll position there (see view.ts), and that write
 * lands *after* the clear: measured, and it put `puzzles.scroll` back into an
 * otherwise empty store every single time. A button that promises everything
 * cannot leave one thing behind because of the way it finishes.
 *
 * A latch rather than unhooking the listener, because the listener is not the
 * point — anything at all writing between the clear and the new document is
 * wrong, and this is the one door all of it goes through. It lives only as long
 * as this document does, which is exactly as long as it is needed.
 */
let forgotten = false

/**
 * The three ways this file touches the store, so that the guard, the failure
 * and the shrug live in one place each.
 *
 * Every one of these was written out with its own `try`/`catch` and its own
 * comment saying the same thing: a blocked store — private browsing, quota — is
 * survivable, and the app is fine, it just forgets.
 */
const get = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const put = (key: string, value: string): void => {
  if (forgotten) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Full or blocked. Playing on without it is the fallback.
  }
}

const drop = (key: string): void => {
  if (forgotten) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to do about it.
  }
}

export function readSave(name: string): string | null {
  const text = get(save(name))
  return text?.startsWith(MAGIC) ? text : null
}

export const writeSave = (name: string, text: string): void => put(save(name), text)

export const clearSave = (name: string): void => drop(save(name))

/**
 * Whether the app was left inside a puzzle rather than at the gallery.
 *
 * Read as presence, not as a value: anything stored is true. See the note at
 * the top for why there is no "false" to write.
 */
export const readPlaying = (): boolean => !!get(PLAYING)

export function setPlaying(playing: boolean): void {
  if (playing) put(PLAYING, '1')
  else drop(PLAYING)
}

/**
 * The puzzle most recently played, which the gallery marks as the one you are
 * on.
 *
 * Outlives leaving it — the gallery still has to say which of the forty you
 * came off — so nothing deletes it. There is always a most recent puzzle once
 * there has been one, and whether you are still in it is `playing`.
 */
export const readRecent = (): string | null => get(RECENT)

export const writeRecent = (name: string): void => put(RECENT, name)

/**
 * Where the gallery was scrolled to, or null if it has never said.
 *
 * Null is not zero: nothing remembered means the gallery has to guess where to
 * open, and the top is a poor guess when the puzzle you were on is in row ten.
 * A remembered zero is the top on purpose.
 */
export function readScroll(): number | null {
  const text = get(SCROLL)
  if (text === null) return null
  const y = Number(text)
  return Number.isFinite(y) ? Math.max(0, y) : null
}

export const writeScroll = (y: number): void => put(SCROLL, String(Math.round(y)))

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
    const stored = JSON.parse(get(INTRODUCED) ?? '[]')
    return new Set(
      Array.isArray(stored) ? stored.filter((n) => typeof n === 'string') : [],
    )
  } catch {
    // Not JSON, or not a list of names. Nothing has introduced itself.
    return new Set()
  }
}

/**
 * Whether this puzzle still owes the reader its introduction — and, in the
 * saying, spends it. Asking is what uses it up, so there is no way to ask and
 * then forget to write it down, and no window in which a reload gets a second
 * one.
 */
/**
 * Everything, gone, and the app started again from nothing.
 *
 * `clear()` rather than deleting the nine names above one at a time: this is
 * the app's own origin and nothing else writes to it, so the two are the same
 * set — and where they ever differed, a reader who asked for everything to go
 * meant the stray as well. It is also the only version of this that cannot fall
 * out of step with the list of keys, which is the failure that matters for a
 * button whose whole promise is "everything".
 *
 * The reload is not tidiness. Half of what was just deleted is held in memory
 * as well — the theme, the language, the put-away games, this file's own set of
 * introductions — and every one of those stores is seeded once at start-up.
 * Clearing underneath them would leave the app showing what it no longer has
 * written down, and would write most of it straight back at the next change.
 * Starting the document again is what makes "as if newly installed" true.
 *
 * The offline copy of the app is deliberately left alone. That is not the
 * reader's data, it is this app's own files, and throwing them away would only
 * cost a download.
 */
export function forgetEverything(): void {
  forgotten = true
  try {
    window.localStorage.clear()
  } catch {
    // Blocked or private: there was nothing kept to throw away.
  }
  window.location.reload()
}

export function takeIntroduction(name: string): boolean {
  introduced ??= read()
  if (introduced.has(name)) return false
  introduced.add(name)
  // Blocked, and the session's own copy above still holds until the tab closes.
  put(INTRODUCED, JSON.stringify([...introduced]))
  return true
}
