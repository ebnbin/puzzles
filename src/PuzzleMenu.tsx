import type { Preset } from './engine/types'

/**
 * Everything that is not Undo or Redo.
 *
 * A sheet over the board rather than a panel below it, so opening it costs
 * the board no room — on a phone the board is the whole point, and anything
 * permanently parked under it is space the puzzle does not get.
 */
export default function PuzzleMenu({
  objective,
  presets,
  selected,
  canSolve,
  permalink,
  compareHref,
  onSelectPreset,
  onAction,
  onClose,
}: {
  objective: string
  presets: Preset[] | null
  selected: number
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  compareHref: string
  onSelectPreset: (value: number) => void
  onAction: (action: 'newGame' | 'restart' | 'solve' | 'enterGameId' | 'enterSeed' | 'preferences') => void
  onClose: () => void
}) {
  return (
    <div className="sheet-dimmer" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-label="Puzzle menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />

        <div className="sheet-actions">
          <button type="button" onClick={() => onAction('newGame')}>New game</button>
          <button type="button" onClick={() => onAction('restart')}>Restart</button>
          {canSolve && (
            <button type="button" onClick={() => onAction('solve')}>Solve</button>
          )}
          <button type="button" onClick={() => onAction('enterGameId')}>Game ID…</button>
          <button type="button" onClick={() => onAction('enterSeed')}>Seed…</button>
          <button type="button" onClick={() => onAction('preferences')}>
            Preferences…
          </button>
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

        <section>
          <h2>How to play</h2>
          <p>{objective}</p>
        </section>

        <section className="sheet-links">
          {permalink && (
            <p>
              Link to this puzzle: <a href={`#${permalink.desc}`}>by game ID</a>
              {permalink.seed && (
                <>
                  {' · '}
                  <a href={`#${permalink.seed}`}>by random seed</a>
                </>
              )}
            </p>
          )}
          <p>
            <a href={compareHref}>Compare with the original page</a>
          </p>
        </section>
      </div>
    </div>
  )
}

/** Presets can nest; render the tree as grouped radios. */
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
            <label>
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
