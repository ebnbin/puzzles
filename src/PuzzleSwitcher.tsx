import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
 * A panel, not a screen: three whole rows and half of the fourth. The half is
 * the point — a row cut across the middle is the plainest possible statement
 * that the list continues, and it costs nothing to read because each tile is
 * a card with its own edges. Whole rows and a flush bottom would say the
 * opposite, which would be a lie ten rows long.
 */
const ROWS = 3

/** Never past this, however tall the tiles come out. */
const MAX_HEIGHT_VH = 0.6

type Placement = { top: number; left: number; width: number }

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
  return { top, left, width }
}

/**
 * How tall three and a half rows of whatever the grid decided on comes to.
 *
 * Measured rather than worked out: the column count is `auto-fill`'s to
 * choose, and re-deriving its arithmetic here would be a second copy of the
 * layout that could disagree with the first.
 */
function fit(panel: HTMLElement, grid: HTMLElement, top: number) {
  const items = [...grid.children] as HTMLElement[]
  const first = items[0]
  const wrapped = first && items.find((el) => el.offsetTop > first.offsetTop)
  if (!first || !wrapped) return
  // Layout metrics, not painted ones: this runs while the opening animation
  // still has the panel at scale(0.97), and a measured rectangle would come
  // back three per cent short.
  const pitch = wrapped.offsetTop - first.offsetTop
  const padding = parseFloat(getComputedStyle(panel).paddingTop) || 0
  const rows = padding + pitch * ROWS + first.offsetHeight / 2
  const room = window.innerHeight - top - MARGIN
  panel.style.maxHeight = `${Math.min(rows, room, window.innerHeight * MAX_HEIGHT_VH)}px`
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
  const panelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  // The trigger is already on screen, so the first render can be in the right
  // place — no frame at the top-left corner on the way there.
  const [at, setAt] = useState<Placement>(() => place(anchor.current))

  useEffect(() => {
    const remeasure = () => setAt(place(anchor.current))
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [anchor])

  // Keyed on the width, which is what decides how many columns `auto-fill`
  // lays out and therefore how tall a row is. Before paint, so the panel is
  // never shown at one height and then another.
  useLayoutEffect(() => {
    if (panelRef.current && gridRef.current)
      fit(panelRef.current, gridRef.current, at.top)
  }, [at.width, at.top])

  // Open on the puzzle you are playing, wherever it falls in the list — the
  // one at the bottom should not need a scroll to be found. After the height
  // is settled, or it would centre against the wrong box.
  useLayoutEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="pop-catcher" onClick={onClose}>
      <div
        ref={panelRef}
        className="pop pop-switch"
        role="dialog"
        aria-modal="true"
        aria-label={t.play.switcher}
        style={{ top: at.top, left: at.left, width: at.width }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="switch-grid" ref={gridRef}>
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
                    {/* Not lazy, for the same reason as the launcher's: the
                        panel is open, the reader is looking at it, and a
                        no-cache server makes every lazy image a visible
                        round trip. */}
                    <img
                      src={`/icons/${game.name}.png`}
                      alt=""
                      width={256}
                      height={256}
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
