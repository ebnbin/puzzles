import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import Icon from './Icon'
import type { IconName } from './Icon'
import type { DialogSpec } from './engine/types'
import { useStrings } from './i18n'
import { useShare } from './useShare'
import { useSheetDrag } from './useSheetDrag'

type Action = 'newGame' | 'restart' | 'solve' | 'enterGameId' | 'enterSeed'

/** The label is looked up by the same name the action goes by. */
const ACTIONS: { action: Action; icon: IconName }[] = [
  { action: 'newGame', icon: 'add' },
  { action: 'restart', icon: 'restart' },
  { action: 'solve', icon: 'solve' },
  { action: 'enterGameId', icon: 'gameId' },
  { action: 'enterSeed', icon: 'seed' },
]

/**
 * Everything you do to the game in front of you.
 *
 * A sheet over the board rather than a panel below it, so opening it costs
 * the board no room — on a phone the board is the whole point, and anything
 * permanently parked under it is space the puzzle does not get.
 *
 * New game leads, filled rather than tonal: it is what the sheet is opened for
 * most of the time, and it is also the one that throws the position away, so
 * it is worth being unmistakable.
 *
 * What game you are given next is not here — that is a list as long as the
 * puzzle cares to make it, and it has a sheet of its own. See PuzzleTypes.
 *
 * The preferences are here, and open: they were a button that led to a dialog
 * on top of this sheet, which is a layer too many for a handful of switches
 * that only ever change how the board looks. Each takes effect as it is set,
 * and nothing here closes.
 */
export default function PuzzleMenu({
  canSolve,
  permalink,
  fullscreen,
  prefs,
  prefsError,
  onOpenPrefs,
  onCommitPrefs,
  onAction,
  onClose,
}: {
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  /**
   * Not something asked of the puzzle — it is the window. It sits here rather
   * than in the bar because the bar is four glyphs now, and of the five this
   * is the one nobody presses twice a game.
   */
  fullscreen: { supported: boolean; active: boolean; toggle: () => void }
  /** The preferences, once the back end has handed them over. */
  prefs: DialogSpec | null
  /** What it said about a value, if it refused one. */
  prefsError: string | null
  onOpenPrefs: () => void
  onCommitPrefs: () => void
  onAction: (action: Action) => void
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()

  /*
   * Ask for them as the sheet appears. They are a section of it, not a place
   * to go, so there is nothing to press first — and asking once is enough,
   * because the back end hands back a fresh set after every change it takes.
   */
  const open = useRef(onOpenPrefs)
  open.current = onOpenPrefs
  useEffect(() => {
    open.current()
  }, [])

  return (
    <div className="sheet-dimmer" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t.menu.title}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        <div className="sheet-handle" aria-hidden="true">
          <div className="sheet-grip" />
        </div>

        <div className="sheet-actions">
          {ACTIONS.filter((a) => a.action !== 'solve' || canSolve).map((a) => (
            <button
              key={a.action}
              type="button"
              className={a.action === 'newGame' ? 'is-primary' : undefined}
              onClick={() => onAction(a.action)}
            >
              <Icon name={a.icon} />
              {t.menu[a.action]}
            </button>
          ))}
          {fullscreen.supported && (
            <button
              type="button"
              aria-pressed={fullscreen.active}
              onClick={() => {
                fullscreen.toggle()
                onClose()
              }}
            >
              <Icon name={fullscreen.active ? 'fullscreenExit' : 'fullscreen'} />
              {fullscreen.active ? t.play.exitFullscreen : t.play.fullscreen}
            </button>
          )}
        </div>

        {/* Some puzzles offer none, and an empty heading is worse than no
            heading. */}
        {prefs && prefs.controls.length > 0 && (
          <section>
            <h2>{t.menu.preferences}</h2>
            <div className="sheet-prefs">
              <ConfigFields controls={prefs.controls} onCommit={onCommitPrefs} />
              {prefsError && (
                <p className="sheet-custom-error" role="alert">
                  {prefsError}
                </p>
              )}
            </div>
          </section>
        )}

        {permalink && (
          <section className="sheet-links">
            <h2>{t.menu.share}</h2>
            <ShareRow label={t.menu.gameId} value={permalink.desc} />
            {permalink.seed && (
              <ShareRow label={t.menu.seed} value={permalink.seed} />
            )}
          </section>
        )}
      </div>
    </div>
  )
}

/**
 * A link to this exact puzzle, which hands itself out.
 *
 * The address is not shown. It is thirty characters of base-36 that nobody
 * reads and nobody types — the row is a verb, not a display — and neither is
 * the word "share", which the icon says and the pairing makes obvious.
 *
 * Still an anchor, so the address is real: it can be opened, and the browser's
 * own copy-link is there for anyone who reaches for it. If there is no share
 * sheet and no clipboard — an insecure origin — the click is left alone, and
 * the browser puts the link in the address bar instead.
 */
function ShareRow({ label, value }: { label: string; value: string }) {
  const { share, copied } = useShare()
  const href = `#${value}`

  return (
    <a
      className="sheet-link"
      href={href}
      onClick={(e) => {
        if (!navigator.share && !navigator.clipboard) return
        e.preventDefault()
        share(new URL(href, window.location.href).href, label)
      }}
    >
      <span className="sheet-link-text">{label}</span>
      <span className="sheet-link-copy" data-copied={copied}>
        <Icon name={copied ? 'check' : 'share'} size={18} />
      </span>
    </a>
  )
}
