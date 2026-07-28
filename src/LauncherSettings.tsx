import Icon from './Icon'
import type { Engine } from './engine'
import type { Theme } from './useTheme'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/**
 * The two things there are to decide and the one place to read more, behind the
 * button that means "settings".
 *
 * They were a card at the top of the launcher, which put a quarter of the first
 * screen between the reader and the puzzles for two switches most people touch
 * once.
 */
export default function LauncherSettings({
  engine,
  setEngine,
  theme,
  setTheme,
  onClose,
}: {
  engine: Engine
  setEngine: (next: Engine) => void
  theme: Theme
  setTheme: (next: Theme) => void
  onClose: () => void
}) {
  return (
    <div className="dialog-dimmer" onClick={onClose}>
      <div
        className="dialog dialog-settings"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Settings</h2>

        <label className="setting engine">
          <input
            type="checkbox"
            checked={engine === 'ts'}
            onChange={(e) => setEngine(e.target.checked ? 'ts' : 'wasm')}
          />
          {/* Both states say what you get, rather than one of them repeating
              what the switch already shows. */}
          <span className="setting-text">
            New design
            <em>
              {engine === 'ts'
                ? 'Redesigned for phone and desktop'
                : 'The original layout'}
            </em>
          </span>
          <span className="engine-track" aria-hidden="true">
            <span className="engine-knob" />
          </span>
        </label>

        <div className="setting">
          <span className="setting-text">Appearance</span>
          <div className="segmented" role="radiogroup" aria-label="Appearance">
            {THEMES.map((option) => (
              <label key={option.value} data-selected={theme === option.value}>
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* A new tab: the manual is a separate site, and coming back should
            not mean loading the app again. */}
        <a
          className="setting setting-link"
          href="/doc/"
          target="_blank"
          rel="noreferrer"
        >
          <span className="setting-text">
            Manual
            <em>Rules and controls for every puzzle</em>
          </span>
          <Icon name="external" size={18} />
        </a>

        <div className="dialog-buttons">
          <button type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
