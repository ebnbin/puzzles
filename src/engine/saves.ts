/**
 * Where progress lives between visits.
 *
 * Two kinds of key. Each game has one save — the midend's own serialisation,
 * byte-identical to what the desktop builds write to a .sav file, rewritten
 * after every move so there is never a moment worth losing. And one key for
 * the whole app names the game that was up when it was left, so the next
 * cold start can go straight back to it; arriving at the launcher on purpose
 * deletes it.
 *
 * Everything here shrugs off a blocked store — private browsing, quota — the
 * same way the preferences do: the app is fine, it just forgets.
 */

const LAST = 'puzzles.last'
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
