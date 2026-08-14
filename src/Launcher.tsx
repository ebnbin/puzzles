import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import LauncherSettings from './LauncherSettings'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  // 长按 450ms 生效时磁贴已经离场,松手的 click 按「当下指下的元素」结算,落在
  // 滑进来的另一张卡上(实测长按 Cube 隐藏了 Cube、打开了 Fifteen):吞 click
  // 必须吊在 window 捕获阶段,挂在磁贴自己身上吃不到;click 不来时靠 pointerup
  // 延时清监听,不许留着吃下一次点击。
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

const GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] md:gap-3'

export default function Launcher() {
  const [settingsOpen, setSettingsOpen] = useState(false)
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
    // 两段式不能内联:view transition 的旧快照只拍得到「已经在页面上」的
    // viewTransitionName,所以先渲染一帧把名字挂上,layout effect 里才真正换屏。
    pending.current = change
    setMoving(game.name)
  }

  useLayoutEffect(() => {
    const change = pending.current
    if (!change) return
    pending.current = null
    // 摘名只归最新一班:第二次按会 abandon 前一次,老 land 不许把新 flight 的名字摘掉。
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

  useEffect(() => {
    setPlaying(false)
  }, [])

  const openSettings = () => setSettingsOpen(true)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

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
    <div>
      <header className="mb-5 flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-[650] tracking-[-0.025em] md:text-3xl">
            {t.brand}
          </h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t.tagline}
          </p>
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
        <ThemeToggle size="icon" className="ml-[0.6rem]" />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.launcher.settings}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={openSettings}
        >
          <Icon name="prefs" />
        </Button>
      </header>

      <ul className={cn('games', GRID)}>
        {shown.map((game) => tile(game, false))}
      </ul>

      {away.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            className="flex min-h-9 items-center gap-[0.45rem] rounded-full px-[0.8rem] text-sm font-medium text-muted-foreground"
            aria-expanded={hiddenOpen}
            style={
              flyingToStash ? { viewTransitionName: `tile-${moving}` } : undefined
            }
            onClick={() => setHiddenOpen((open) => !open)}
          >
            <Icon name="eyeOff" size={16} />
            {t.launcher.hidden(away.length)}
            <Icon
              name="caret"
              size={16}
              className={cn('transition-transform', hiddenOpen && 'rotate-180')}
            />
          </button>
          {hiddenOpen && (
            <ul className={cn('games mt-3', GRID)}>
              {away.map((game) => tile(game, true))}
            </ul>
          )}
        </section>
      )}

      <footer className="mt-10 border-t border-border pt-5 text-xs text-faint">
        <p>
          {t.launcher.credit} {t.launcher.source}{' '}
          <Button asChild variant="link" size="bare">
            <a href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/">
              chiark.greenend.org.uk
              <Icon name="external" size={14} />
            </a>
          </Button>
        </p>
      </footer>

      {settingsOpen && <LauncherSettings onClose={closeSettings} />}

      {toast && (
        <p
          key={toast.key}
          role="status"
          className="toast pointer-events-none fixed left-1/2 top-20 z-50 flex max-w-[min(85vw,22rem)] -translate-x-1/2 animate-drop-in items-start gap-[0.4rem] rounded-md bg-raised px-[0.7rem] py-2 text-sm text-foreground shadow-(--shadow-2) [&_svg]:mt-[0.15rem] [&_svg]:shrink-0"
        >
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
    <li className="group/tile relative">
      <button
        type="button"
        className={cn(
          'games-tile flex h-full w-full flex-col items-stretch overflow-hidden rounded-lg bg-card text-left shadow-(--shadow-1) transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-(--shadow-2) active:scale-[0.985] active:shadow-(--shadow-1)',
          here && 'ring-2 ring-inset ring-primary',
        )}
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
        <span
          className={cn(
            'block bg-board leading-[0]',
            hidden && 'opacity-55 group-hover/tile:opacity-100',
          )}
        >
          {/* 故意不加 loading="lazy":服务器对 /tiles 回 no-cache,lazy 图在滚入
              视口那一刻付一次 revalidation 往返,从游戏返回画廊还要再付;
              四十张小 PNG 比空白便宜。 */}
          <img
            src={`/tiles/${game.name}-${theme}.png`}
            alt=""
            width={256}
            height={256}
            decoding="async"
            draggable={false}
            className="block aspect-square h-auto w-full"
          />
        </span>
        <strong
          className={cn(
            'block truncate px-2 pt-[0.45rem] text-sm font-semibold tracking-[-0.01em]',
            here && 'font-[650] text-primary',
          )}
        >
          {game.displayName}
        </strong>
        <span className="mb-2 line-clamp-2 px-2 pt-[0.05rem] text-2xs text-muted-foreground">
          {game.description}
        </span>
      </button>
      <button
        type="button"
        className="absolute right-[0.3rem] top-[0.3rem] hidden size-[1.8rem] place-items-center rounded-full bg-scrim text-white focus-visible:grid group-hover/tile:grid [@media(hover:hover)]:group-focus-within/tile:grid"
        aria-label={label}
        title={label}
        onClick={() => onToggle(game)}
      >
        <Icon name={hidden ? 'eye' : 'eyeOff'} size={15} />
      </button>
    </li>
  )
}
