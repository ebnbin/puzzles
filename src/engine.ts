import { useCallback, useState } from 'react'

/**
 * Which build of the puzzles to play.
 *
 * `ts` is this app: our own screens around upstream's compiled game code.
 * `wasm` is upstream's own HTML pages, served unmodified, which is what the
 * switch on the launcher turns back on.
 */
export type Engine = 'wasm' | 'ts'

const KEY = 'puzzles.engine'

/** Ours by default; only an explicit opt-out sends you to upstream's pages. */
function read(): Engine {
  try {
    return window.localStorage.getItem(KEY) === 'wasm' ? 'wasm' : 'ts'
  } catch {
    return 'ts'
  }
}

export function useEngine(): [Engine, (next: Engine) => void] {
  const [engine, setEngine] = useState<Engine>(read)

  const update = useCallback((next: Engine) => {
    setEngine(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // Private browsing or a blocked store — the choice just won't persist.
    }
  }, [])

  return [engine, update]
}

/** Where a game lives under the given engine. */
export function gameHref(name: string, engine: Engine): string {
  return engine === 'ts' ? `/ts/${name}` : `/games/${name}.html`
}
