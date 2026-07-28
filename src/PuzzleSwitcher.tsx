import { useEffect, useRef } from 'react'
import { gameHref } from './engine'
import { useStrings } from './i18n'
import { useGames } from './i18n/games'
import { onNavClick } from './router'
import { useSheetDrag } from './useSheetDrag'

/**
 * Forty puzzles, one tap away from the one you are playing.
 *
 * The way between two puzzles used to be back to the gallery, scroll, tap —
 * three screens to answer "what does this one look like in dark?". The name in
 * the bar is the natural place to ask from, so it opens the list.
 *
 * Art first, the same bet the gallery makes: these thumbnails are drawn from
 * the positions upstream chose, and they are what a puzzle is recognised by
 * long before its name is read. Denser than the gallery, though — this is a
 * switcher, not a browse, so more of the collection is on screen at once and
 * there is less to scroll past.
 *
 * The same sheet the puzzle menu uses, so it is dragged away with the same
 * gesture and lands as a centred dialog once there is room for one. Real
 * links, so the browser's own middle-click and open-in-new-tab still work.
 */
export default function PuzzleSwitcher({
  current,
  onClose,
}: {
  current: string
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()
  const games = useGames()
  const currentRef = useRef<HTMLAnchorElement>(null)

  // Open on the puzzle you are playing, wherever it falls in the list — the
  // one at the bottom should not need a scroll to be found.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="sheet-dimmer" onClick={onClose}>
      <div
        className="sheet sheet-switch"
        role="dialog"
        aria-modal="true"
        aria-label={t.play.switcher}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        {/* Pinned: the sheet opens already scrolled to wherever you are in the
            list, and both the label and the grab strip have to survive that. */}
        <div className="switch-head">
          <div className="sheet-handle" aria-hidden="true">
            <div className="sheet-grip" />
          </div>
          <h2>{t.play.switcher}</h2>
        </div>

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
                    // Already here: the sheet is the only thing in the way.
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
