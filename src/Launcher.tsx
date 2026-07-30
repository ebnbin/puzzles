import { useEffect, useLayoutEffect, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import { clearLast } from './engine/saves'
import { useLang, useStrings } from './i18n'
import type { Lang } from './i18n'
import { useGames } from './i18n/games'
import { onNavClick, takeLauncherScroll } from './router'

/**
 * The gallery.
 *
 * Forty thumbnails rendered from the positions upstream chose are the best
 * thing this app has to show, so they lead: art, then the name, then the line
 * upstream files each puzzle under, three across on a phone, on the
 * collection's own grey so each one bleeds to the edges of its tile.
 *
 * All forty, in the collection's own order, always. Nothing is hidden and
 * nothing is sorted: the order is upstream's, which means a puzzle is where it
 * was the last time you looked.
 */
export default function Launcher() {
  // Where the page was when the settings opened: opening the dialog scrolls
  // the document to the top on its own, so it has to be caught on the click,
  // before that happens, and handed to the lock.
  const [settingsAt, setSettingsAt] = useState<number | null>(null)
  const t = useStrings()
  const [lang, setLang] = useLang()
  const games = useGames()

  // The one control that must be readable in the language you are stuck in,
  // so its labels never translate: your own language, named in itself or in
  // the code everyone is shown, is the thing you can always find.
  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
  ]

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

  const settingsOpen = settingsAt !== null
  const openSettings = () => setSettingsAt(window.scrollY)
  const closeSettings = () => setSettingsAt(null)
  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  return (
    <div className="launcher">
      <header className="masthead">
        <h1>{t.brand}</h1>
        {/* First-level, beside the settings: of everything there is to set,
            the language is the one a reader may need before they can read
            anything else. */}
        <div
          className="segmented"
          role="radiogroup"
          aria-label={t.settings.language}
        >
          {langs.map((option) => (
            <label key={option.value} data-selected={lang === option.value}>
              <input
                type="radio"
                name="lang"
                value={option.value}
                checked={lang === option.value}
                onChange={() => setLang(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="masthead-icon"
          aria-label={t.launcher.settings}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={openSettings}
        >
          <Icon name="prefs" />
        </button>
      </header>

      <ul className="games">
        {games.map((game) => (
          <li key={game.name}>
            <a href={`/${game.name}`} onClick={onNavClick}>
              <span className="games-art">
                {/* Not lazy: the server answers these with no-cache, so a lazy
                    image pays a revalidation round trip at the moment it
                    scrolls into view — and again on every return from a game.
                    Forty small PNGs are cheaper than the blank. */}
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

      {settingsAt !== null && (
        <LauncherSettings lockAt={settingsAt} onClose={closeSettings} />
      )}
    </div>
  )
}
