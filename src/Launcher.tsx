import { useEffect, useLayoutEffect, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import { clearLast } from './engine/saves'
import { useStrings } from './i18n'
import { useGames } from './i18n/games'
import { onNavClick, takeLauncherScroll } from './router'

/**
 * The gallery.
 *
 * Forty thumbnails rendered from the positions upstream chose are the best
 * thing this app has to show, so they lead: art, then the name, then the line
 * upstream files each puzzle under, three across on a phone, on the
 * collection's own grey so each one bleeds to the edges of its tile.
 */
export default function Launcher() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const t = useStrings()
  const games = useGames()

  /*
   * Back where the reader left off. Layout-effect, not effect: inside the
   * view transition the new page is snapshotted as soon as this render
   * commits, and the scroll has to already be right in that picture.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, takeLauncherScroll())
  }, [])

  /*
   * Being here is the choice to be here: a cold start would have been taken
   * straight back to the last game before React rendered anything (see
   * main.tsx), so reaching the launcher always means the reader left a game
   * for it — and the way back in is a tile, not the next cold start.
   */
  useEffect(() => {
    clearLast()
  }, [])

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
        <h1>{t.brand}</h1>
        <button
          type="button"
          className="masthead-icon"
          aria-label={t.launcher.settings}
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
            <a href={`/${game.name}`} onClick={onNavClick}>
              <span className="games-art">
                {/* Not lazy: the server answers these with no-cache, so a
                    lazy image pays a revalidation round trip at the moment
                    it scrolls into view — and again on every return from a
                    game. Forty small PNGs are cheaper than the blank. */}
                <img
                  src={`/icons/${game.name}.png`}
                  alt=""
                  width={256}
                  height={256}
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
          {t.launcher.credit} {t.launcher.source}{' '}
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
        <LauncherSettings onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
