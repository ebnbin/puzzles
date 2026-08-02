import { flushSync } from 'react-dom'

/**
 * Making a change visible as a change.
 *
 * Two places want the same thing: the screen swap in view.ts, and putting a
 * tile away in the gallery. Both replace what is on screen with something laid
 * out differently, and both are easier to follow if the browser animates the
 * difference rather than cutting to it.
 *
 * The mechanics are the same either way and were written out twice, which is
 * how two of anything start to drift: the feature test, the reduced-motion
 * test, and the `flushSync` that puts React's render inside the captured frame
 * instead of in React's own time — without it the callback returns before
 * anything has changed and the transition captures the same picture twice.
 */

type ViewTransition = { finished: Promise<void> }

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition
}

/**
 * Whether there is a transition to be had at all: a browser that does them,
 * and a reader who has not asked for less movement.
 *
 * Exported because a caller may have preparation to do — the gallery names
 * forty tiles so the browser can follow them across the change — and there is
 * no point preparing for something that is about to happen instantly.
 */
export function canTransition(): boolean {
  return (
    typeof (document as WithViewTransition).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Which transition is the live one. A second change while the first is still
 * running makes the browser abandon that first one, and its `finished` settles
 * a moment later — after the second has taken over the root. Without this the
 * older transition's tidying would undress the newer one mid-flight.
 */
let live = 0

/**
 * Apply `update` inside a view transition, and hand back the transition so a
 * caller with tidying to do can wait for it.
 *
 * Null means it happened without one — no browser support, or a reader who has
 * asked for less movement. The update itself always happens: this decides how
 * it is shown, never whether.
 *
 * `kind` names what is being transitioned, on the root, for as long as it
 * lasts. The two callers want opposite things from the page behind the change
 * — a screen swap is the page being replaced and should cross-fade, a tile
 * moving is one thing crossing a page that is otherwise standing still — and
 * `::view-transition-*(root)` is a single pseudo-element with nothing else to
 * tell them apart by. See index.css.
 */
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
    // Both arms: `finished` is not specified to reject, and an unhandled one
    // here would be a console error over a cosmetic attribute.
    transition.finished.then(undress, undress)
  }
  return transition
}
