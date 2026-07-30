import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import { clearLast, readCurrent } from './engine/saves'
import { useLang, useStrings } from './i18n'
import type { Lang } from './i18n'
import { useGames } from './i18n/games'
import type { GameText } from './i18n/games'
import { openGame, rememberGalleryScroll, takeGalleryScroll } from './view'
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
 *
 * Coming back here is coming back to the same place. The puzzle you are on
 * keeps its ring, and the list opens where you left it — both remembered in the
 * store rather than in memory, because the visit this matters for begins with a
 * reload: the app resumes inside a puzzle, and the gallery's first appearance is
 * after the session that scrolled it is gone.
 */
export default function Launcher() {
  // Where the page was when the settings opened: opening the dialog scrolls
  // the document to the top on its own, so it has to be caught on the click,
  // before that happens, and handed to the lock.
  const [settingsAt, setSettingsAt] = useState<number | null>(null)
  const [hiddenOpen, setHiddenOpen] = useState(false)
  const t = useStrings()
  const [lang, setLang] = useLang()
  const games = useGames()
  const hidden = useHidden()

  // The one control that must be readable in the language you are stuck in,
  // so its labels never translate: your own language, named in itself or in
  // the code everyone is shown, is the thing you can always find.
  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
  ]

  const shown = games.filter((g) => !hidden.has(g.name))
  const away = games.filter((g) => hidden.has(g.name))

  // The puzzle you are on, marked wherever it falls — including in the stash,
  // if you put away the one you were playing.
  const current = readCurrent()
  const currentRef = useRef<HTMLButtonElement>(null)

  /*
   * A word of confirmation when a tile is put away or brought back. The tile
   * moving is the real feedback, but the long press gives none until it has
   * already happened, and a vanished tile does not say where it went. Keyed,
   * so a second toggle restarts the animation instead of extending the old
   * toast's stay.
   */
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  const toastKey = useRef(0)
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggle = (game: GameText) => {
    const text = hidden.has(game.name)
      ? t.launcher.nowShown(game.displayName)
      : t.launcher.nowHidden(game.displayName)
    toggleHidden(game.name)
    setToast({ text, key: ++toastKey.current })
  }

  /*
   * Back where the reader left off. Layout-effect, not effect: inside the
   * view transition the new page is snapshotted as soon as this render
   * commits, and the scroll has to already be right in that picture.
   *
   * Nothing remembered means this gallery has never been scrolled — a first
   * visit, or a store that forgets. Then the tile you came off is the best guess
   * at where you were, which is what the switcher this replaced always did.
   */
  useLayoutEffect(() => {
    const at = takeGalleryScroll()
    if (at !== null) window.scrollTo(0, at)
    else currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  /*
   * The position is written on the way into a puzzle (see view.ts), which is
   * every way out of here but one: the tab being reloaded, hidden or closed from
   * this screen. That leaves this as the last moment to write it.
   *
   * `settingsAt` rather than the live position when the settings are up: the
   * dialog pins the document at the top, so `scrollY` reads zero, and the offset
   * caught at the click that opened it is the real one.
   */
  useEffect(() => {
    const record = () => rememberGalleryScroll(settingsAt ?? window.scrollY)
    const onHidden = () => {
      if (document.visibilityState === 'hidden') record()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', record)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', record)
    }
  }, [settingsAt])

  /*
   * Being here is the choice to be here: a cold start would have been taken
   * straight back to the last game before React rendered anything (see
   * main.tsx), so reaching the launcher always means the reader left a game
   * for it — and the way back in is a tile, not the next cold start.
   */
  useEffect(() => {
    clearLast()
  }, [])

  const tile = (game: GameText, stashed: boolean) => {
    const here = game.name === current
    return (
      <Tile
        key={game.name}
        game={game}
        hidden={stashed}
        here={here}
        tileRef={here ? currentRef : undefined}
        onToggle={toggle}
      />
    )
  }

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

      <ul className="games">{shown.map((game) => tile(game, false))}</ul>

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
              {away.map((game) => tile(game, true))}
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

      {settingsAt !== null && (
        <LauncherSettings lockAt={settingsAt} onClose={closeSettings} />
      )}

      {toast && (
        <div key={toast.key} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}

/**
 * One game: a button, with the way to put it away riding along.
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
function Tile({
  game,
  hidden,
  here,
  tileRef,
  onToggle,
}: {
  game: GameText
  hidden: boolean
  /** The puzzle the app is on: this tile wears the ring. */
  here?: boolean
  tileRef?: React.Ref<HTMLButtonElement>
  onToggle: (game: GameText) => void
}) {
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
      onToggle(game)
    }, HOLD_MS)
  }
  const up = () => window.clearTimeout(timer.current)

  return (
    <li>
      {/* A button, not a link: there is no address for a puzzle to be at, and
          pressing this changes what the app shows rather than going anywhere. */}
      <button
        type="button"
        className="games-tile"
        data-game={game.name}
        ref={tileRef}
        aria-current={here ? 'true' : undefined}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        // The browser's own long-press menu would race ours.
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (held.current) {
            held.current = false
            return
          }
          openGame(game.name)
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
      </button>
      <button
        type="button"
        className="games-stow"
        aria-label={label}
        title={label}
        onClick={() => onToggle(game)}
      >
        <Icon name={hidden ? 'eye' : 'eyeOff'} size={15} />
      </button>
    </li>
  )
}
