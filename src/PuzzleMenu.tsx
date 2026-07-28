import Icon from './Icon'
import type { IconName } from './Icon'
import type { Preset } from './engine/types'
import { useShare } from './useShare'
import { useSheetDrag } from './useSheetDrag'

type Action =
  | 'newGame'
  | 'restart'
  | 'solve'
  | 'enterGameId'
  | 'enterSeed'
  | 'preferences'

const ACTIONS: { action: Action; label: string; icon: IconName }[] = [
  { action: 'newGame', label: 'New game', icon: 'add' },
  { action: 'restart', label: 'Restart', icon: 'restart' },
  { action: 'solve', label: 'Solve', icon: 'solve' },
  { action: 'enterGameId', label: 'Game ID…', icon: 'gameId' },
  { action: 'enterSeed', label: 'Seed…', icon: 'seed' },
  { action: 'preferences', label: 'Preferences…', icon: 'prefs' },
]

/**
 * Everything that is not Undo or Redo.
 *
 * A sheet over the board rather than a panel below it, so opening it costs
 * the board no room — on a phone the board is the whole point, and anything
 * permanently parked under it is space the puzzle does not get.
 *
 * New game leads, filled rather than tonal: it is what the sheet is opened for
 * most of the time, and it is also the one that throws the position away, so
 * it is worth being unmistakable.
 */
export default function PuzzleMenu({
  presets,
  selected,
  canSolve,
  permalink,
  onSelectPreset,
  onAction,
  onClose,
}: {
  presets: Preset[] | null
  selected: number
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  onSelectPreset: (value: number) => void
  onAction: (action: Action) => void
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)

  return (
    <div className="sheet-dimmer" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Puzzle menu"
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
              {a.label}
            </button>
          ))}
        </div>

        {presets && (
          <section>
            <h2>Type</h2>
            <PresetList
              presets={presets}
              selected={selected}
              onSelect={onSelectPreset}
            />
          </section>
        )}

        {permalink && (
          <section className="sheet-links">
            <h2>Share</h2>
            <ShareRow label="Game ID" value={permalink.desc} />
            {permalink.seed && (
              <ShareRow label="Random seed" value={permalink.seed} />
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

/**
 * Presets can nest; render the tree as grouped radios.
 *
 * Chips rather than a list of rows: a puzzle can offer twenty of these, and as
 * rows that is a screen of scrolling to reach the bottom one. They stay real
 * radios — the group is a single choice, arrow keys should move through it, and
 * a screen reader should say so.
 */
function PresetList({
  presets,
  selected,
  onSelect,
}: {
  presets: Preset[]
  selected: number
  onSelect: (value: number) => void
}) {
  return (
    <ul className="sheet-presets">
      {presets.map((preset, i) => (
        <li key={i}>
          {preset.submenu ? (
            <>
              <span className="sheet-preset-group">{preset.name}</span>
              <PresetList
                presets={preset.submenu}
                selected={selected}
                onSelect={onSelect}
              />
            </>
          ) : (
            <label data-selected={selected === preset.value}>
              <input
                type="radio"
                name="preset"
                checked={selected === preset.value}
                onChange={() => preset.value !== null && onSelect(preset.value)}
              />
              {preset.name}
            </label>
          )}
        </li>
      ))}
    </ul>
  )
}
