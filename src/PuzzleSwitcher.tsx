import { useEffect, useRef, useState } from 'react'
import { gameHref } from './engine'
import { useStrings } from './i18n'
import { useGames } from './i18n/games'
import { onNavClick } from './router'

/**
 * Forty puzzles, one tap away from the one you are playing.
 *
 * The way between two puzzles used to be back to the gallery, scroll, tap —
 * three screens to answer "what does this one look like?". The name in the bar
 * is the natural place to ask from, so it opens the list.
 *
 * It comes out of the name and stays attached to it: measured against the
 * button that opened it and pinned under its left edge, so the panel is
 * visibly a part of the title rather than a second surface that happens to be
 * on screen. Measured rather than laid out in CSS because the bar rearranges
 * itself — landscape, fullscreen, a long puzzle name — and a hard-coded offset
 * would be right in exactly one of those.
 *
 * Art first, the same bet the gallery makes: these thumbnails are drawn from
 * the positions upstream chose, and they are what a puzzle is recognised by
 * long before its name is read. Denser than the gallery, though — this is a
 * switcher, not a browse.
 */

const MARGIN = 8
const GAP = 6
const MAX_WIDTH_REM = 26
/**
 * A panel, not a screen. Four rows or so, with the next one cut off at the
 * bottom so it is obvious there is more — and enough of the board still
 * showing that you have not lost the thing you were looking at.
 */
const MAX_HEIGHT_VH = 0.6

type Placement = { top: number; left: number; width: number; maxHeight: number }

function place(anchor: HTMLElement | null): Placement {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const view = { w: window.innerWidth, h: window.innerHeight }
  const box = anchor?.getBoundingClientRect()

  const width = Math.min(view.w - MARGIN * 2, MAX_WIDTH_REM * rem)
  const top = (box ? box.bottom : MARGIN) + GAP
  // Under the name's left edge, unless that would hang it off the screen.
  const left = Math.min(
    Math.max(MARGIN, box ? box.left : MARGIN),
    view.w - MARGIN - width,
  )
  const maxHeight = Math.min(view.h - top - MARGIN, view.h * MAX_HEIGHT_VH)
  return { top, left, width, maxHeight }
}

export default function PuzzleSwitcher({
  current,
  anchor,
  onClose,
}: {
  current: string
  anchor: React.RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const t = useStrings()
  const games = useGames()
  const currentRef = useRef<HTMLAnchorElement>(null)
  // The trigger is already on screen, so the first render can be in the right
  // place — no frame at the top-left corner on the way there.
  const [at, setAt] = useState<Placement>(() => place(anchor.current))

  useEffect(() => {
    const remeasure = () => setAt(place(anchor.current))
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [anchor])

  // Open on the puzzle you are playing, wherever it falls in the list — the
  // one at the bottom should not need a scroll to be found.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="pop-catcher" onClick={onClose}>
      <div
        className="pop pop-switch"
        role="dialog"
        aria-modal="true"
        aria-label={t.play.switcher}
        style={{
          top: at.top,
          left: at.left,
          width: at.width,
          maxHeight: at.maxHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="switch-grid">
          {games.map((game) => {
            const here = game.name === current
            return (
              <li key={game.name}>
                <a
                  ref={here ? currentRef : undefined}
                  href={gameHref(game.name, 'ts')}
                  aria-current={here ? 'page' : undefined}
                  onClick={(e) => {
                    // Already here: the panel is the only thing in the way.
                    if (here) {
                      e.preventDefault()
                      onClose()
                      return
                    }
                    onNavClick(e)
                  }}
                >
                  <span className="switch-art">
                    <img
                      src={`/icons/${game.name}.png`}
                      alt=""
                      width={256}
                      height={256}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="switch-name">{game.displayName}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
