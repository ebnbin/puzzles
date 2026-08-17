// 对局屏幕的装配处:四个域各管各的(useEngine 起引擎、useBoard 通棋盘、
// useConfigBox 管对话框协议、useOutcome 判完成),这里把它们接起来再画出来。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PuzzleActions from './PuzzleActions'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import Dialog from '../../ui/Dialog'
import Icon from '../../ui/Icon'
import Notice from '../../ui/Notice'
import ThemeToggle from '../../ui/ThemeToggle'
// 写全 index:裸的 ../games 会被解析成 games.json。
import { gameOf } from '../../games/index'
import type { Key } from '../../games/game'
import { padButtons } from '../../games/util/pad'
import { markIntroduced, owesIntroduction } from '../../engine/saves'
import type { CanvasRenderer } from '../../engine/renderer'
import type { PuzzleApi } from '../../engine/types'
import { openManual } from '../manual/Manual'
import { manualHref, fill, useLang, useStrings } from '../../i18n'
import { showGallery } from '../../view'
import { useAssist } from './useAssist'
import { useArrows } from './useArrows'
import { useBoard } from './useBoard'
import { useConfigBox } from './useConfigBox'
import { START_FAILED, useEngine } from './useEngine'
import { useHelp } from './useHelp'
import { useOutcome } from './useOutcome'
import HoldTip, { useHoldTip } from '../../ui/HoldTip'
import { useResolvedTheme } from '../../useTheme'
import { usePuzzleFit } from './usePuzzleFit'
import { usePuzzlePointer } from './usePuzzlePointer'

const SHORTCUT_KEYS = /^[urn]$/i

const NO_SWATCHES: ReadonlyMap<number, string> = new Map()

export default function PuzzleHost({
  name,
  title,
  objective,
}: {
  name: string
  title: string
  objective: string
}) {
  // Puzzle 页已按 games.json 把过关,注册表和 games.json 的一致由构建期检查
  // 把守,这里不可能拿不到。
  const game = gameOf(name)
  if (!game) throw new Error(`no game registered as ${name}`)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<PuzzleApi | null>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)

  const [error, setError] = useState<string | null>(null)
  const armedSave = useRef(false)
  const acted = useCallback(() => {
    armedSave.current = true
    setError(null)
  }, [])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 3000)
    return () => window.clearTimeout(timer)
  }, [error])

  const theme = useResolvedTheme()
  const t = useStrings()
  const [lang] = useLang()
  const help = useHelp(game.pages.help)

  const board = useBoard(game, apiRef, rendererRef, acted)
  const outcome = useOutcome(name, apiRef)
  const config = useConfigBox(apiRef, acted, board.setPrefs)
  const engine = useEngine({
    name,
    game,
    canvasRef,
    areaRef,
    apiRef,
    rendererRef,
    armedSave,
    setError,
    theme,
    board,
    outcome,
    config,
  })

  const { ready, permalink } = engine
  const {
    dialog,
    inline,
    inlineError,
    textError,
    openInline,
    closeInline,
    commitInline,
    submitText,
    readPrefs,
    abandonInline,
    clearTextError,
  } = config

  const wanted = useArrows()
  const arrows = wanted && game.arrows !== null
  const helping = useAssist()

  const [menuOpen, setMenuOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [intro, setIntro] = useState(false)

  useEffect(() => {
    if (ready && owesIntroduction(name)) setIntro(true)
  }, [ready, name])

  // ------------------------------------------------------------ 键盘

  const id = permalink ? decodeURIComponent(permalink.desc) : ''
  const prefs = board.view.prefs
  // 上方区域的顺序是结构,不是各游戏手写出来的约定:entry 在前、pick 居中、
  // assist 在后;sort 稳定,组内保留声明序。
  const keys = useMemo(() => {
    const dealt = game.keypad({ params: id.split(':')[0], prefs })
    if (!dealt) return []
    const order = ['entry', 'pick', 'assist']
    return dealt
      .filter((k) => (k.group === 'assist' ? helping : k.group !== 'pick' || arrows))
      .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
  }, [arrows, helping, id, game, prefs])

  // 圆键要引擎调色板里的哪几号。渲染之前就得知道:颜色是 renderer 翻完主题才有的。
  const { viewNow } = board
  const padInk = useMemo(() => {
    const slots = new Set<number>()
    for (const key of keys) {
      const face = typeof key.face === 'function' ? key.face(viewNow()) : key.face
      if ('swatch' in face.art) {
        slots.add(face.art.swatch.fill)
        if (face.art.swatch.edge !== undefined) slots.add(face.art.swatch.edge)
      }
    }
    return [...slots]
  }, [keys, viewNow])

  usePuzzleFit(
    areaRef,
    apiRef,
    rendererRef,
    ready,
    permalink?.desc.split(':')[0] ?? '',
  )
  const pointer = usePuzzlePointer(
    apiRef,
    rendererRef,
    game.touch.hold === 'middle' ? 1 : 2,
  )

  const [swatches, setSwatches] = useState<ReadonlyMap<number, string>>(NO_SWATCHES)
  // 必须是 effect,且要跑在 useEngine 里翻主题的 effect 之后(effect 按 hook
  // 调用序跑,useEngine 在上面):那边才把 renderer 的调色表翻面,这里是新颜色
  // 存在的第一刻;memo 会读到旧主题。
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !ready) return
    const next = new Map<number, string>()
    for (const slot of padInk) {
      const css = renderer.colour(slot)
      if (css) next.set(slot, css)
    }
    // 比内容不比身份:padInk 每次重算都是新数组,照身份换会白白多一轮渲染。
    setSwatches((was) =>
      was.size === next.size && [...next].every(([n, css]) => was.get(n) === css)
        ? was
        : next,
    )
  }, [padInk, theme, ready])

  const act = useCallback(
    (fn: (api: PuzzleApi) => void) => {
      if (!apiRef.current || dialog) return
      acted()
      fn(apiRef.current)
      canvasRef.current?.focus()
    },
    [dialog, acted],
  )

  useEffect(() => {
    if (ready && game.prefs.volatile) readPrefs()
  }, [ready, game, readPrefs])

  const closeTypes = useCallback(() => {
    abandonInline()
    setTypesOpen(false)
  }, [abandonInline])

  const closeMenu = useCallback(() => {
    abandonInline()
    setMenuOpen(false)
  }, [abandonInline])

  const closeHelp = useCallback(() => setHelpOpen(false), [])

  const { tip, holdToAsk, wasHeld } = useHoldTip()

  const { typed } = board
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const api = apiRef.current
      if (!api) return
      acted()
      typed({
        key: e.key,
        ...(e.location === 3 ? { pad: true as const } : {}),
        ...(e.shiftKey ? { shift: true as const } : {}),
        ...(e.ctrlKey ? { ctrl: true as const } : {}),
      })
      if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
        e.preventDefault()
      if (game.prefs.volatile) readPrefs()
    },
    [acted, game, readPrefs, typed],
  )

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        if (typesOpen) closeTypes()
        else if (menuOpen) closeMenu()
        else return
        e.preventDefault()
        return
      }
      if (dialog || helpOpen || typesOpen || menuOpen) return
      // 棋盘聚焦时后端已经吃过这一按,defaultPrevented 挡二次处理(否则一按两撤);
      // 走 api.key 而不是直接 undo():快捷键可能被玩家关掉,有的游戏把这些字母当走子。
      if (e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      const api = apiRef.current
      if (!api) return
      if (!SHORTCUT_KEYS.test(e.key)) return
      acted()
      if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
        e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    ready,
    dialog,
    menuOpen,
    typesOpen,
    closeTypes,
    closeMenu,
    helpOpen,
    acted,
  ])

  const pressKey = useCallback(
    (key: Key<unknown>) => {
      acted()
      key.press(board.handle)
      canvasRef.current?.focus()
    },
    [acted, board.handle],
  )

  const arrowPad = game.arrows ? padButtons(game.arrows, board.view, board.handle) : null

  const panelled =
    inline?.kind === 'prefs'
      ? (() => {
          const controls = game.prefs.panel(inline.spec.controls)
          return controls === inline.spec.controls
            ? inline.spec
            : { ...inline.spec, controls: [...controls] }
        })()
      : null

  return (
    <div
      className="play"
      data-ready={ready}
      data-arrows={arrows ? 'true' : undefined}
    >
      <header className="play-bar">
        <h1>
          <button
            type="button"
            className="play-title"
            onClick={showGallery}
            aria-label={`${title} — ${t.play.switcher}`}
          >
            <span>{title}</span>
            <Icon name="caret" size={18} />
          </button>
        </h1>
        <span
          className="play-status"
          data-filled={!!engine.status}
          aria-live="polite"
          {...(engine.status ? holdToAsk(engine.status) : {})}
        >
          {engine.status}
        </span>
        <ThemeToggle className="play-icon" />
        <button
          type="button"
          className="play-icon"
          aria-label={t.play.help}
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen(true)}
        >
          <Icon name="help" />
        </button>
      </header>

      <div className="play-board" ref={areaRef}>
        {error && (
          <Notice
            floating
            text={error === START_FAILED ? t.play.error : error}
          />
        )}
        {intro && !error && (
          <Notice
            kind="info"
            floating
            text={objective}
            onClose={() => {
              markIntroduced(name)
              setIntro(false)
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          onPointerDownCapture={() => {
            acted()
            board.sleep()
          }}
          className="host-board"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          {...pointer}
        />
        {outcome.over && (
          <div className="play-over" role="group" aria-label={t.play.over}>
            <button
              type="button"
              className="is-primary"
              onClick={() => {
                outcome.dismiss()
                act((a) => a.newGame())
              }}
            >
              <Icon name="add" />
              {t.menu.newGame}
            </button>
            <button type="button" onClick={outcome.dismiss}>
              <Icon name="close" />
              {t.play.close}
            </button>
          </div>
        )}
      </div>

      <PuzzleKeypad keys={keys} view={board.view} swatches={swatches} onPress={pressKey} />

      <PuzzleActions
        pad={arrows ? arrowPad : null}
        undo={engine.undoRedo.undo}
        redo={engine.undoRedo.redo}
        typesShown={!ready || !!engine.presets}
        typesEnabled={!!engine.presets}
        typesOpen={typesOpen}
        menuOpen={menuOpen}
        holdToAsk={holdToAsk}
        wasHeld={wasHeld}
        onUndo={() => act((a) => a.undo())}
        onRedo={() => act((a) => a.redo())}
        onTypes={() => {
          closeMenu()
          setTypesOpen(true)
        }}
        onMenu={() => {
          closeTypes()
          clearTextError()
          setMenuOpen(true)
        }}
        onPress={(key) => {
          acted()
          key.press()
          canvasRef.current?.focus()
        }}
      />

      <HoldTip tip={tip} />

      {helpOpen && (
        <Dialog
          label={`${t.play.help} — ${title}`}
          title={t.play.help}
          onClose={closeHelp}
          className="dialog-help"
        >
          <img
            className="help-art"
            src={`/howto/${game.pages.howto}-${theme}.png`}
            alt={fill(t.play.picture, { name: title })}
            draggable={false}
          />
          <div className="dialog-prose">
            {help ? (
              <div dangerouslySetInnerHTML={{ __html: help }} />
            ) : (
              <p>{objective}</p>
            )}
            <p className="prose-more">
              <a
                href={manualHref(lang, `${game.pages.manual}.html`)}
                onClick={(e) => {
                  e.preventDefault()
                  closeHelp()
                  openManual(`${game.pages.manual}.html`)
                }}
              >
                {t.play.fullInstructions}
              </a>
            </p>
          </div>
        </Dialog>
      )}

      {typesOpen && engine.presets && (
        <PuzzleTypes
          presets={engine.presets}
          selected={engine.selected}
          standard={engine.standard}
          custom={inline?.kind === 'custom' ? inline.spec : null}
          customError={inlineError}
          onSelectPreset={(value) => {
            engine.setSelected(value)
            act((a) => a.selectPreset(value))
          }}
          onOpenCustom={() => openInline('custom')}
          onCloseCustom={closeInline}
          onCommitCustom={commitInline}
          onClose={closeTypes}
        />
      )}

      {menuOpen && (
        <PuzzleMenu
          canSolve={engine.canSolve}
          permalink={permalink}
          prefs={panelled}
          prefsError={inlineError}
          onOpenPrefs={() => openInline('prefs')}
          onCommitPrefs={commitInline}
          textError={textError}
          onSubmitText={submitText}
          onAction={(action) => {
            abandonInline()
            act((a) => a[action]())
            setMenuOpen(false)
          }}
          onClose={closeMenu}
        />
      )}

      {dialog && apiRef.current && (
        <PuzzleDialog
          spec={dialog}
          onOk={() => apiRef.current?.dialogOk()}
          onCancel={() => apiRef.current?.dialogCancel()}
        />
      )}
    </div>
  )
}
