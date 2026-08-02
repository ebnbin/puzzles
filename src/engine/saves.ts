/**
 * Where progress lives between visits.
 *
 * Each game has one save — the midend's own serialisation, byte-identical to
 * what the desktop builds write to a .sav file, rewritten after every move so
 * there is never a moment worth losing.
 *
 * Then four keys for the app itself. `last` is a screen: the game that was up
 * when the app was left, so the next cold start goes straight back to it, and
 * arriving at the gallery on purpose deletes it. Two more are the gallery's own
 * memory of itself — which puzzle to mark and where it was scrolled to — and
 * they are why coming back to it is coming back to the same place rather than
 * to the top of a list of forty. The last one is which puzzles have already
 * introduced themselves.
 *
 * Everything here shrugs off a blocked store — private browsing, quota — the
 * same way the preferences do: the app is fine, it just forgets.
 */

const LAST = 'puzzles.last'
const CURRENT = 'puzzles.current'
const SCROLL = 'puzzles.scroll'
const INTRODUCED = 'puzzles.helpseen'
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

export function readLast(): string | null {
  try {
    return window.localStorage.getItem(LAST)
  } catch {
    return null
  }
}

export function writeLast(name: string): void {
  try {
    window.localStorage.setItem(LAST, name)
  } catch {
    // See above.
  }
}

export function clearLast(): void {
  try {
    window.localStorage.removeItem(LAST)
  } catch {
    // See above.
  }
}

/**
 * The puzzle the gallery marks as the one you are on.
 *
 * Not the same fact as `last`, which is a screen and so is empty the moment the
 * gallery is up. This one is a puzzle, and it outlives leaving one: the gallery
 * still has to say which of the forty you came off. Nothing deletes it — there
 * is always a most recent puzzle once there has been one.
 */
export function readCurrent(): string | null {
  try {
    return window.localStorage.getItem(CURRENT)
  } catch {
    return null
  }
}

export function writeCurrent(name: string): void {
  try {
    window.localStorage.setItem(CURRENT, name)
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
