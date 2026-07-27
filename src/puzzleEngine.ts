import { useEffect, useRef, useState } from 'react'

export type EngineStatus = 'loading' | 'ready' | 'error'

/**
 * Mount upstream's compiled puzzle into markup the caller has already
 * rendered.
 *
 * The module resolves every element it needs by id the moment the factory
 * runs, so this deliberately happens in an effect, after the host markup is
 * in the document. From then on the C code owns those nodes — React must not
 * re-render them.
 */
export function usePuzzleEngine(name: string): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>('loading')
  const started = useRef(false)

  useEffect(() => {
    // Instantiating twice would leave two modules fighting over one canvas,
    // and the module has no teardown to undo the first. StrictMode runs
    // effects twice in development, so refuse the second run outright.
    if (started.current) return
    started.current = true

    // Its frame timer re-arms itself through requestAnimationFrame on every
    // frame, and nothing stops it when we navigate away. Record the handles
    // taken out while the puzzle is mounted so unmount can break the chain.
    const raf = window.requestAnimationFrame.bind(window)
    const pending = new Set<number>()
    window.requestAnimationFrame = (callback) => {
      const handle = raf(callback)
      pending.add(handle)
      return handle
    }

    let live = true
    import(/* @vite-ignore */ `/engine/${name}.js`)
      .then((module) => module.default())
      .then(() => live && setStatus('ready'))
      .catch((error) => {
        if (!live) return
        console.error(`could not start ${name}`, error)
        setStatus('error')
      })

    return () => {
      live = false
      window.requestAnimationFrame = raf
      pending.forEach((handle) => window.cancelAnimationFrame(handle))
    }
  }, [name])

  return status
}
