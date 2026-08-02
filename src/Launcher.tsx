import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import { clearLast, readCurrent } from './engine/saves'
import { useLang, useStrings } from './i18n'
import type { Lang } from './i18n'
import { useGames } from './i18n/games'
import type { GameText } from './i18n/games'
import { canTransition, withViewTransition } from './transition'
import { openGame, rememberGalleryScroll, takeGalleryScroll } from './view'
import { toggleHidden, useHidden } from './useHidden'
import { useResolvedTheme } from './useTheme'

/** A press has to be still for this long before it means hide, not open. */
const HOLD_MS = 450

/**
 * Eat the click that ends a long press.
 *
 * A hold acts at 450ms, while the finger is still down, and the tile it acts on
 * leaves the grid there and then. The finger comes up some time later onto
 * whatever has slid into that place, and the browser resolves the tap against
 * what is under it *now*: measured on a phone profile, a 1400ms press on Cube
 * hid Cube and opened Fifteen.
 *
 * The tile used to swallow its own click, which was right while a hold could
 * only ever produce a click on the tile that was held. It cannot: the click
 * lands somewhere else by definition, because the press is what moved the thing
 * that was there. So the swallow is on the window, in the capture phase, ahead
 * of every tile.
 *
 * It comes off on that click, whichever tile it was headed for. If none ever
 * arrives — a press the browser cancels out from under us, taking the tap with
 * it — the pointer coming up sweeps it away a beat later, so a listener that
 * has nothing to eat cannot sit there waiting to eat something else.
 */
function swallowTapAfterHold() {
  const eat = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }
  const done = () => {
    window.removeEventListener('click', eat, true)
    window.removeEventListener('pointerup', sweep, true)
    window.removeEventListener('pointercancel', sweep, true)
  }
  const sweep = () => window.setTimeout(done, 400)

  window.addEventListener('click', eat, { capture: true, once: true })
  window.addEventListener('pointerup', sweep, { capture: true, once: true })
  window.addEventListener('pointercancel', sweep, { capture: true, once: true })
}

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
  const [toast, setToast] = useState<{
    text: string
    hidden: boolean
    key: number
  } | null>(null)
  const toastKey = useRef(0)
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  /*
   * --- watching a tile move -------------------------------------------------
   *
   * A tile put away leaves the grid and joins the stash at the foot of the
   * page; brought back, it returns to the fixed place the collection's order
   * gives it. Both are real moves, and a browser will animate them for us — but
   * only between two pictures it has actually taken, and only for elements it
   * was told to follow across the two. So `moving` is the name of the tile in
   * flight, and it has to be on the page for a beat *before* the change: the
   * old picture is taken from what is already there.
   *
   * Hence a render, then a layout effect, then the change. The click writes
   * down what to do and names the tile; the effect finds that note and spends
   * it inside the transition. The name comes off again when the transition
   * finishes, so forty tiles carry it for a quarter of a second rather than for
   * the life of the page — it makes each one its own layer, which is worth
   * paying for while they are moving and not otherwise.
   */
  const [moving, setMoving] = useState<string | null>(null)
  const pending = useRef<(() => void) | null>(null)
  /** Which flight is the live one; see the same counter in transition.ts. */
  const flight = useRef(0)

  const toggle = (game: GameText) => {
    const wasHidden = hidden.has(game.name)
    const change = () => {
      toggleHidden(game.name)
      setToast({
        text: wasHidden
          ? t.launcher.nowShown(game.displayName)
          : t.launcher.nowHidden(game.displayName),
        hidden: !wasHidden,
        key: ++toastKey.current,
      })
    }
    // Nothing to watch means nothing to prepare: the whole point of the extra
    // render is to have the tiles named in the picture taken before the change.
    if (!canTransition()) {
      change()
      return
    }
    pending.current = change
    setMoving(game.name)
  }

  useLayoutEffect(() => {
    const change = pending.current
    if (!change) return
    pending.current = null
    const mine = ++flight.current
    const transition = withViewTransition(change, 'tiles')
    // A second press abandons this one, and its `finished` settles just after
    // the next has begun — by which time taking the names off would strand the
    // tiles the new flight is following.
    const land = () => {
      if (flight.current === mine) setMoving(null)
    }
    if (transition) transition.finished.then(land, land)
    else land()
  }, [moving])

  /*
   * Where the tile in flight is going, when there is nowhere to go.
   *
   * Every case but one has a tile at both ends: put away with the stash open,
   * or brought back — which can only be done from an open stash — and the
   * browser has an old rectangle and a new one for the same name. Put away with
   * the stash folded up, the tile simply stops being rendered, and a name with
   * nothing to arrive at fades out where it stood, saying nothing about where
   * the game went.
   *
   * So the stash's own line takes the name for that one case. It is a different
   * element, which the browser does not mind — it pairs the two pictures by
   * name, not by identity — and the tile flies down and lands on the row that
   * now counts it. Which is, exactly, where it went.
   */
  const flyingToStash = moving !== null && hidden.has(moving) && !hiddenOpen

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

  const settingsOpen = settingsAt !== null
  const openSettings = () => setSettingsAt(window.scrollY)
  // Stable, because Dialog listens for Escape on it. There is no key handler
  // here any more: dismissing is a dialog's own business, and this screen had
  // its own copy of it.
  const closeSettings = useCallback(() => setSettingsAt(null), [])

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
        // All of them, not only the one pressed: the tiles that close the gap
        // it left, or open one for it to come back to, are half of what makes
        // the move legible. Named only while something is in flight.
        moving={moving !== null}
      />
    )
  }

  return (
    <div className="launcher">
      <header className="masthead">
        {/* The name and the line under it are one block, so that the two
            controls beside them sit against the pair rather than beside the
            name with the line pushed under all three. */}
        <div className="masthead-name">
          <h1>{t.brand}</h1>
          <p>{t.tagline}</p>
        </div>
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
            style={
              flyingToStash ? { viewTransitionName: `tile-${moving}` } : undefined
            }
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

      {/* Named for what just happened, with the same two glyphs the tile's own
          corner button carries — so the picture says which way it went and the
          sentence only has to say which game. `status` and not `alert`: this
          confirms a press, it does not interrupt for one. */}
      {toast && (
        <p key={toast.key} className="notice notice-toast" role="status">
          <Icon name={toast.hidden ? 'eyeOff' : 'eye'} size={16} />
          <span>{toast.text}</span>
        </p>
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
 * A press that turned out to be a hold must not also open anything, and the
 * tap it ends with is not this tile's to refuse — see swallowTapAfterHold.
 */
function Tile({
  game,
  hidden,
  here,
  tileRef,
  onToggle,
  moving,
}: {
  game: GameText
  hidden: boolean
  /** The puzzle the app is on: this tile wears the ring. */
  here?: boolean
  tileRef?: React.Ref<HTMLButtonElement>
  onToggle: (game: GameText) => void
  /** Something is in flight: take a name, so the browser can follow you. */
  moving: boolean
}) {
  const t = useStrings()
  const theme = useResolvedTheme()
  const label = hidden ? t.launcher.show(game.displayName) : t.launcher.hide(game.displayName)

  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const down = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      swallowTapAfterHold()
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
        // A tile is in one grid or the other, never both, so its name is
        // unique at the moment the pictures are taken — which is all the
        // browser asks of it.
        style={moving ? { viewTransitionName: `tile-${game.name}` } : undefined}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        // The browser's own long-press menu would race ours.
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => openGame(game.name)}
      >
        <span className="games-art">
          {/* Not lazy: the server answers these with no-cache, so a lazy
              image pays a revalidation round trip at the moment it scrolls
              into view — and again on every return from a game. Forty small
              PNGs are cheaper than the blank. */}
          <img
            src={`/icons/${game.name}-${theme}.png`}
            alt=""
            width={256}
            height={256}
            decoding="async"
            // The face of a button, not a file. See the `img` rule in
            // index.css for the half of this the other browsers read.
            draggable={false}
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
