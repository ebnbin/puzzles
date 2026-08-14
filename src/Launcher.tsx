import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import ThemeToggle from './ThemeToggle'
import { readRecent, setPlaying } from './engine/saves'
import { useLang, useStrings } from './i18n'
import type { Lang } from './i18n'
import { useGames } from './i18n/games'
import type { GameText } from './i18n/games'
import { canTransition, withViewTransition } from './transition'
import { openGame, rememberGalleryScroll, takeGalleryScroll } from './view'
import { toggleHidden, useHidden } from './useHidden'
import { useResolvedTheme } from './useTheme'

const HOLD_MS = 450

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

export default function Launcher() {
  const [settingsAt, setSettingsAt] = useState<number | null>(null)
  const [hiddenOpen, setHiddenOpen] = useState(false)
  const t = useStrings()
  const [lang, setLang] = useLang()
  const games = useGames()
  const hidden = useHidden()

  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
  ]

  const shown = games.filter((g) => !hidden.has(g.name))
  const away = games.filter((g) => hidden.has(g.name))

  const current = readRecent()
  const currentRef = useRef<HTMLButtonElement>(null)

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

  const [moving, setMoving] = useState<string | null>(null)
  const pending = useRef<(() => void) | null>(null)
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
    const land = () => {
      if (flight.current === mine) setMoving(null)
    }
    if (transition) transition.finished.then(land, land)
    else land()
  }, [moving])

  const flyingToStash = moving !== null && hidden.has(moving) && !hiddenOpen

  useLayoutEffect(() => {
    const at = takeGalleryScroll()
    if (at !== null) window.scrollTo(0, at)
    else currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

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

  useEffect(() => {
    setPlaying(false)
  }, [])

  const settingsOpen = settingsAt !== null
  const openSettings = () => setSettingsAt(window.scrollY)
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
        moving={moving !== null}
      />
    )
  }

  return (
    <div className="launcher">
      <header className="masthead">
        <div className="masthead-name">
          <h1>{t.brand}</h1>
          <p>{t.tagline}</p>
        </div>
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
        <ThemeToggle className="masthead-icon" />
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

      {toast && (
        <p key={toast.key} className="notice notice-toast" role="status">
          <Icon name={toast.hidden ? 'eyeOff' : 'eye'} size={16} />
          <span>{toast.text}</span>
        </p>
      )}
    </div>
  )
}

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
  here?: boolean
  tileRef?: React.Ref<HTMLButtonElement>
  onToggle: (game: GameText) => void
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
      <button
        type="button"
        className="games-tile"
        data-game={game.name}
        ref={tileRef}
        aria-current={here ? 'true' : undefined}
        style={moving ? { viewTransitionName: `tile-${game.name}` } : undefined}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => openGame(game.name)}
      >
        <span className="games-art">
          <img
            src={`/tiles/${game.name}-${theme}.png`}
            alt=""
            width={256}
            height={256}
            decoding="async"
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
