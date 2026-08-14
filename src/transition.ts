import { flushSync } from 'react-dom'

type ViewTransition = { finished: Promise<void> }

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition
}

export function canTransition(): boolean {
  return (
    typeof (document as WithViewTransition).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

let live = 0

export function withViewTransition(
  update: () => void,
  kind?: string,
): ViewTransition | null {
  if (!canTransition()) {
    update()
    return null
  }
  const start = (document as WithViewTransition).startViewTransition!
  const root = document.documentElement
  const mine = ++live
  if (kind) root.dataset.transition = kind
  const transition = start.call(document, () => flushSync(update))
  if (kind) {
    const undress = () => {
      if (live === mine) delete root.dataset.transition
    }
    transition.finished.then(undress, undress)
  }
  return transition
}
