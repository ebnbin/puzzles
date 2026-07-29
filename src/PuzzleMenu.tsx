import Icon from './Icon'
import type { IconName } from './Icon'
import { useStrings } from './i18n'
import { useShare } from './useShare'
import { useSheetDrag } from './useSheetDrag'

type Action =
  | 'newGame'
  | 'restart'
  | 'solve'
  | 'enterGameId'
  | 'enterSeed'
  | 'preferences'

/** The label is looked up by the same name the action goes by. */
const ACTIONS: { action: Action; icon: IconName }[] = [
  { action: 'newGame', icon: 'add' },
  { action: 'restart', icon: 'restart' },
  { action: 'solve', icon: 'solve' },
  { action: 'enterGameId', icon: 'gameId' },
  { action: 'enterSeed', icon: 'seed' },
  { action: 'preferences', icon: 'prefs' },
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
 */
export default function PuzzleMenu({
  canSolve,
  permalink,
  onAction,
  onClose,
}: {
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  onAction: (action: Action) => void
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()

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
        </div>

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
