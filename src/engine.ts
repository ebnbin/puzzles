import { useCallback, useState } from 'react'

/**
 * Which implementation of the puzzles to play.
 *
 * `wasm` is upstream's C compiled to WebAssembly, served as upstream's own
 * unmodified HTML pages. `ts` is our TypeScript rewrite, which is where the
 * puzzles are heading but is not implemented yet.
 */
export type Engine = 'wasm' | 'ts'

const KEY = 'puzzles.engine'

function read(): Engine {
  try {
    return window.localStorage.getItem(KEY) === 'ts' ? 'ts' : 'wasm'
  } catch {
    return 'wasm'
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
