import Icon from './Icon'
import games from './games.json'
import { gameHref, useEngine } from './engine'
import { onNavClick } from './router'
import type { Theme } from './useTheme'
import { useTheme } from './useTheme'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/**
 * The gallery.
 *
 * Forty thumbnails rendered from the positions upstream chose are the best
 * thing this app has to show, so they are the thing it shows: art first, on the
 * collection's own grey so each one bleeds to the edges of its tile. Names like
 * Twiddle and Flip tell you nothing on their own, so the description stays.
 */
export default function Launcher() {
  const [engine, setEngine] = useEngine()
  const [theme, setTheme] = useTheme()
  const ts = engine === 'ts'

  return (
    <div className="launcher">
      <header className="masthead">
        <h1>Puzzles</h1>
        <a className="textlink" href="/doc/">
          Manual
          <Icon name="external" size={14} />
        </a>
      </header>

      <div className="settings">
        <label className="setting engine">
          <input
            type="checkbox"
            checked={ts}
            onChange={(e) => setEngine(e.target.checked ? 'ts' : 'wasm')}
          />
          {/* Both states say what you get, rather than one of them repeating
              what the switch already shows. */}
          <span className="setting-text">
            New design
            <em>
              {ts ? 'Redesigned for phone and desktop' : 'The original layout'}
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
      </div>

      <ul className="games">
        {games.map((game) => (
          <li key={game.name}>
            {/* Only the TypeScript route is ours to route; the WebAssembly
                pages are static files, so those links leave the app. */}
            <a
              href={gameHref(game.name, engine)}
              onClick={ts ? onNavClick : undefined}
            >
              <span className="games-art">
                <img
                  src={`/icons/${game.name}.png`}
                  alt=""
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <strong>{game.displayName}</strong>
              <span className="games-desc">{game.description}</span>
            </a>
          </li>
        ))}
      </ul>

      <footer>
        <p>
          Puzzles are the work of Simon Tatham and contributors, distributed
          under the MIT licence. Source:{' '}
          <a
            className="textlink"
            href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/"
          >
            chiark.greenend.org.uk
            <Icon name="external" size={14} />
          </a>
        </p>
      </footer>
    </div>
  )
}
