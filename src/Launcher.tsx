import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { clearLast, readCurrent } from './engine/saves'
import { docHref, useLang, useStrings } from './i18n'
import { useGames } from './i18n/games'
import type { GameText } from './i18n/games'
import { openGame, rememberGalleryScroll, takeGalleryScroll } from './view'
import { toggleHidden, useHidden } from './useHidden'
import { useTheme } from './useTheme'

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
  const [hiddenOpen, setHiddenOpen] = useState(false)
  const t = useStrings()
  const [lang, setLang] = useLang()
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'
  const games = useGames()
  const hidden = useHidden()

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
   */
  useEffect(() => {
    const record = () => rememberGalleryScroll(window.scrollY)
    const onHidden = () => {
      if (document.visibilityState === 'hidden') record()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', record)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', record)
    }
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

  return (
    <div className="launcher">
      <header className="masthead">
        <h1>{t.brand}</h1>
        {/* One press, like the button beside it, and the label is the language
            you would get rather than the one you are in. `lang` on the element
            because its text is not in the page's language and a screen reader
            should not read 中文 as though it were English. */}
        <button
          type="button"
          className="masthead-icon lang-switch"
          lang={lang === 'zh' ? 'en' : 'zh-Hans'}
          aria-label={t.launcher.switchLang}
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        >
          {lang === 'zh' ? 'EN' : '中文'}
        </button>
        {/* The same one press the puzzle screen and the manual have. There is
            no third state to cycle through and no dialog behind it: light and
            dark are the whole of what there is to decide here, and one press
            is the whole of how to decide it. */}
        <button
          type="button"
          className="masthead-icon"
          aria-label={dark ? t.play.toLight : t.play.toDark}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
        >
          <Icon name={dark ? 'sun' : 'moon'} />
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
        {/*
         * The way to the manual, which used to be a line inside the settings
         * and is now the foot of the gallery — where a reader who has scrolled
         * past forty puzzles without finding what they wanted has arrived, and
         * where the credit that names the same collection already sits.
         *
         * A tab of its own. This app is one page: a same-tab visit would
         * unload it, taking the open stash and the scroll position with it,
         * and in standalone it would replace the app inside its own window
         * with no tab to come back from.
         */}
        <p className="footer-manual">
          <a className="textlink" href={docHref(lang)} target="_blank" rel="noreferrer">
            <Icon name="book" size={16} />
            {t.launcher.manual}
            <Icon name="external" size={14} />
          </a>
        </p>
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
