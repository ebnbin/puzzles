import { useEffect, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import games from './games.json'
import { gameHref, useEngine } from './engine'
import { onNavClick } from './router'
import type { Theme } from './useTheme'

/**
 * The gallery.
 *
 * Forty thumbnails rendered from the positions upstream chose are the best
 * thing this app has to show, so they lead: art, then the name, then the line
 * upstream files each puzzle under, three across on a phone, on the
 * collection's own grey so each one bleeds to the edges of its tile.
 */
export default function Launcher({
  theme: [theme, setTheme],
}: {
  theme: [Theme, (next: Theme) => void]
}) {
  const [engine, setEngine] = useEngine()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const ts = engine === 'ts'

  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  return (
    <div className="launcher">
      <header className="masthead">
        <h1>Puzzles</h1>
        <button
          type="button"
          className="masthead-icon"
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(true)}
        >
          <Icon name="prefs" />
        </button>
      </header>

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

      {settingsOpen && (
        <LauncherSettings
          engine={engine}
          setEngine={setEngine}
          theme={theme}
          setTheme={setTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
