import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import { clearLast } from './engine/saves'
import { useStrings } from './i18n'
import { useGames } from './i18n/games'
import type { GameText } from './i18n/games'
import { onNavClick, takeLauncherScroll } from './router'
import { toggleHidden, useHidden } from './useHidden'

/** A press has to be still for this long before it means hide, not open. */
const HOLD_MS = 450

/**
 * The gallery.
 *
 * Forty thumbnails rendered from the positions upstream chose are the best
 * thing this app has to show, so they lead: art, then the name, then the line
 * upstream files each puzzle under, three across on a phone, on the
 * collection's own grey so each one bleeds to the edges of its tile.
 *
 * Any of them can be put away — a long press, or the corner button that
 * appears where there is a pointer to hover with — and the put-away wait,
 * folded up below the list, in the collection's own order. Hiding never
 * reorders anything: a game shown again comes back to the place it has
 * always had.
 */
export default function Launcher() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hiddenOpen, setHiddenOpen] = useState(false)
  const t = useStrings()
  const games = useGames()
  const hidden = useHidden()

  const shown = games.filter((g) => !hidden.has(g.name))
  const away = games.filter((g) => hidden.has(g.name))

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
        {shown.map((game) => (
          <Tile key={game.name} game={game} hidden={false} />
        ))}
      </ul>

      {away.length > 0 && (
        <section className="stash">
          <button
            type="button"
            className="stash-toggle"
            aria-expanded={hiddenOpen}
            onClick={() => setHiddenOpen((open) => !open)}
          >
            <Icon name="eyeOff" size={16} />
            {t.launcher.hidden(away.length)}
            <Icon name="caret" size={16} className={hiddenOpen ? 'is-up' : undefined} />
          </button>
          {hiddenOpen && (
            <ul className="games games-stashed">
              {away.map((game) => (
                <Tile key={game.name} game={game} hidden />
              ))}
            </ul>
          )}
        </section>
      )}

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

/**
 * One game: a link, with the way to put it away riding along.
 *
 * Two ways in, one per kind of device. A long press, because on a phone
 * that is what "do something about this tile, don't open it" has come to
 * mean; and a corner button where there is a pointer, because a hover can
 * afford to offer what a touch screen has no room for. The button is also
 * the way in from a keyboard.
 *
 * A press that turned out to be a hold must not also be a click: the click
 * that follows it is swallowed, the same way the keypad's long-press help
 * does it.
 */
function Tile({ game, hidden }: { game: GameText; hidden: boolean }) {
  const t = useStrings()
  const label = hidden ? t.launcher.show(game.displayName) : t.launcher.hide(game.displayName)

  const timer = useRef(0)
  const held = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const down = () => {
    held.current = false
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      held.current = true
      toggleHidden(game.name)
    }, HOLD_MS)
  }
  const up = () => window.clearTimeout(timer.current)

  return (
    <li>
      <a
        href={`/${game.name}`}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        // The browser's own long-press menu would race ours.
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (held.current) {
            held.current = false
            e.preventDefault()
            return
          }
          onNavClick(e)
        }}
      >
        <span className="games-art">
          {/* Not lazy: the server answers these with no-cache, so a lazy
              image pays a revalidation round trip at the moment it scrolls
              into view — and again on every return from a game. Forty small
              PNGs are cheaper than the blank. */}
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
      <button
        type="button"
        className="games-stow"
        aria-label={label}
        title={label}
        onClick={() => toggleHidden(game.name)}
      >
        <Icon name={hidden ? 'eye' : 'eyeOff'} size={15} />
      </button>
    </li>
  )
}
