// 对局屏幕的装配处:四个域各管各的(useEngine 起引擎、useBoard 通棋盘、
// useConfigBox 管对话框协议、useOutcome 判完成),这里把它们接起来再画出来。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PuzzleActions from './PuzzleActions'
import PuzzleDealing from './PuzzleDealing'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import Dialog from '../../ui/Dialog'
import Dock from '../../ui/Dock'
import Icon from '../../ui/Icon'
import Notice from '../../ui/Notice'
import Sheet from '../../ui/Sheet'
import ThemeToggle from '../../ui/ThemeToggle'
import { useMedia } from '../../ui/useMedia'
// 写全 index:裸的 ../games 会被解析成 games.json。
import { gameOf } from '../../games/index'
import type { Key } from '../../games/game'
import { padButtons } from '../../games/util/pad'
import { markIntroduced, owesIntroduction } from '../../engine/saves'
import type { CanvasRenderer } from '../../engine/renderer'
import type { DealAction } from '../../engine/deal'
import type { DealResult } from './useDeal'
import type { DialogControl, PuzzleApi } from '../../engine/types'
import { openManual } from '../manual/Manual'
import { manualHref, fill, useLang, useStrings } from '../../i18n'
import { showGallery } from '../../view'
import { useAssist } from './useAssist'
import { useArrows } from './useArrows'
import { setPanel, usePanel, type Panel } from './usePanel'
import { usePrefer } from './usePrefer'
import { SHORTCUTS_LABEL, useShortcuts } from './useShortcuts'
import { useBoard } from './useBoard'
import { useConfigBox } from './useConfigBox'
import { useDeal } from './useDeal'
import { START_FAILED, useEngine } from './useEngine'
import { useHelp } from './useHelp'
import { useOutcome } from './useOutcome'
import HoldTip, { useHoldTip } from '../../ui/HoldTip'
import { useResolvedTheme } from '../../useTheme'
import { usePuzzleFit } from './usePuzzleFit'
import { usePuzzleKeys, type Shortcut } from './usePuzzleKeys'
import { usePuzzlePointer } from './usePuzzlePointer'

const NO_SWATCHES: ReadonlyMap<number, string> = new Map()

// 够宽的屏幕上,类型 / 菜单面板停靠成右侧栏:棋盘让出宽度,不被盖住。只看宽度,
// 横屏平板也停靠;窄一档(48em 起)sheet 仍是居中卡片,再窄从底部拉起。
const DOCK = '(min-width: 64em)'

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

  // config box 要等 board 造好,而 board 的 prefer 要 config box 才写得动:
  // 一只 ref 把这个环打开,填在渲染里(和下面几处 xxxRef.current = 同一路数)。
  const preferRef = useRef<((use: (prefs: DialogControl[]) => boolean) => boolean | void) | null>(
    null,
  )
  const board = useBoard(game, apiRef, rendererRef, acted, preferRef)
  const outcome = useOutcome(name, apiRef)
  const dealer = useDeal(name, game, apiRef)

  // 发牌:镜像算完才让主线程 loadGame 接手。失败弹提示,取消什么都不做——主线程
  // 那一局从头到尾没被碰过,回滚就是原地不动。load_game 不像 command(2)/(5) 那样
  // 自己收焦点(emcc.c),这里补上,不然发完牌键盘玩法要等玩家先点一下棋盘。
  // 返回结局,给要在发完之后收尾的调用方(类型面板刷新参数表)。
  const runDeal = useCallback(
    async (action: DealAction, direct: (api: PuzzleApi) => void) => {
      const outcome = await dealer.deal(action)
      const api = apiRef.current
      if (api) {
        if (outcome.status === 'unavailable') direct(api)
        else if (outcome.status === 'done') api.loadGame(outcome.save)
        else if (outcome.status === 'failed') setError(outcome.error)
        if (outcome.status !== 'cancelled' && outcome.status !== 'busy')
          canvasRef.current?.focus()
      }
      return outcome.status
    },
    [dealer.deal],
  )

  // 自定义参数的提交也走镜像。包一层 useCallback 是为了让 commitInline 的身份
  // 稳住:这个页面重渲染很勤(readPrefs 一路的 setState)。
  const dealCustom = useCallback(
    (values: readonly (string | number | boolean)[]) =>
      dealer.deal({ kind: 'custom', values }),
    [dealer.deal],
  )
  const config = useConfigBox(apiRef, acted, board.setPrefs, dealCustom)
  preferRef.current = config.writePrefs
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
    openInline,
    refreshInline,
    commitInline,
    readPrefs,
    abandonInline,
  } = config

  const shortcuts = useShortcuts()
  const wanted = useArrows()
  const arrows = wanted && game.arrows !== null
  const helping = useAssist()
  const preferring = usePrefer()

  const wide = useMedia(DOCK)
  // 开着的是哪个面板。宽屏上这就是那份全局记忆:开、关、切换都是用户在改它,进任何
  // 游戏都按它复原。窄屏上是页面自己的临时状态,不读不写记忆。
  const remembered = usePanel()
  const [sheet, setSheet] = useState<Panel>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [intro, setIntro] = useState(false)

  // 窄屏拉起的 sheet 不跟到宽屏去;反过来,停靠的面板被窗口挤掉不算用户操作,
  // 记忆不动,再拉宽照旧复原。
  useEffect(() => {
    if (wide) setSheet(null)
  }, [wide])

  const panel: Panel = wide ? remembered : sheet
  // 类型面板要有预设才画得出内容。引擎起来之前壳先摆上:棋盘从第一帧就按让出的宽度
  // 量尺寸,不会先铺满再跳一下;真没有预设的游戏(今天一个都没有)才不画。
  const shown: Panel = panel === 'types' && ready && !engine.presets ? null : panel
  const docked = wide && shown !== null
  const sheetOpen = !wide && shown !== null

  useEffect(() => {
    if (ready && owesIntroduction(name)) setIntro(true)
  }, [ready, name])

  // ------------------------------------------------------------ 键盘

  const id = permalink ? decodeURIComponent(permalink.desc) : ''
  const prefs = board.view.prefs
  // 上方区域的顺序是结构,不是各游戏手写出来的约定:entry 在前、pick 居中、
  // assist 再后、prefer 收尾;sort 稳定,组内保留声明序。
  const keys = useMemo(() => {
    const dealt = game.keypad({ game: game.id, params: id.split(':')[0], prefs })
    if (!dealt) return []
    const shown: Record<Key<unknown>['group'], boolean> = {
      entry: true,
      pick: arrows,
      assist: helping,
      prefer: preferring,
    }
    const order = ['entry', 'pick', 'assist', 'prefer']
    return dealt
      .filter((k) => shown[k.group])
      .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
  }, [arrows, helping, preferring, id, game, prefs])

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
    game.prefs.volatile ? readPrefs : undefined,
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

  // act 的发牌版:同样的守卫和 acted(),只是动手的是镜像。direct 是没有镜像时
  // (起不了模块 worker)在主线程上直接做的那件事——会卡,但不会没得玩。
  // 守卫挡下的答 null,发了的答结局。
  const deal = useCallback(
    (
      action: DealAction,
      direct: (api: PuzzleApi) => void,
    ): Promise<DealResult['status'] | null> => {
      if (!apiRef.current || dialog) return Promise.resolve(null)
      acted()
      return runDeal(action, direct)
    },
    [dialog, acted, runDeal],
  )

  // 偏好变了就卸膛:上膛键的含义是偏好给的(palisade 切回 Half-grid 之后,原来那
  // 支 Ctrl 上膛既画不出边、也因为走不成而永远不自动卸,同伴键还一直藏着)。
  useEffect(() => {
    board.handle.arm(null)
  }, [board.handle, prefs])

  // 开局读一次。键面形状看偏好的游戏都要这一份(prefer 的亮灭、guess 的色钉标号、
  // palisade 的光标模式);volatile 只多管一件事——物理按键之后再重读一遍。
  useEffect(() => {
    if (ready) readPrefs()
  }, [ready, game, readPrefs])

  const closeHelp = useCallback(() => setHelpOpen(false), [])

  const { tip, holdToAsk, wasHeld } = useHoldTip()

  // ------------------------------------------------------------ 面板

  // 最近一次输入来自指针还是键盘。停靠面板是非模态的:指针在里面点完一样东西,焦点
  // 就还给棋盘(正在打字除外);用键盘走进面板的人不受这条打扰,焦点留在他走到的地方。
  const byPointer = useRef(false)
  useEffect(() => {
    const pointer = () => {
      byPointer.current = true
    }
    const key = () => {
      byPointer.current = false
    }
    window.addEventListener('pointerdown', pointer, true)
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('pointerdown', pointer, true)
      window.removeEventListener('keydown', key, true)
    }
  }, [])

  // done = 这一处的输入已经结束(文本框按了 Enter、面板关掉),不看指针还是键盘。
  // sheet 是模态的,焦点归它自己管,这里只管停靠的面板。
  const settle = useCallback(
    (done = false) => {
      if (wide && (done || byPointer.current)) canvasRef.current?.focus()
    },
    [wide],
  )

  // 开、关、切换面板。宽屏写进记忆,窄屏改临时状态;同一个键再按一次是收起。
  const showPanel = useCallback(
    (next: Panel) => {
      if (!wide) return setSheet(next)
      setPanel(next)
      settle()
    },
    [wide, settle],
  )

  const closePanel = useCallback(() => {
    if (!wide) return setSheet(null)
    setPanel(null)
    settle(true)
  }, [wide, settle])

  // 键盘不认焦点,只认「这一刻谜题该不该吃这一按」:覆盖层盖着就不吃。停靠的面板
  // 不是覆盖层。手册也是覆盖层,但它自己在 window 捕获阶段 stopPropagation,不必
  // 再报一位进来。
  const covered = !!dialog || helpOpen || sheetOpen
  // 上游那三个裸字母快捷键由我们补发,理由和判据都在 useShortcuts.SHORTCUTS_OFF。
  // n 走镜像,u / r 本来就不发牌,照旧同步。
  const onShortcut = useCallback(
    (which: Shortcut) => {
      if (which === 'newGame') deal({ kind: 'newGame' }, (a) => a.newGame())
      else act((a) => (which === 'undo' ? a.undo() : a.redo()))
    },
    [act, deal],
  )

  usePuzzleKeys({
    ready,
    blocked: covered || dealer.dealing,
    apiRef,
    acted,
    typed: board.typed,
    volatile: game.prefs.volatile,
    readPrefs,
    shortcuts,
    onShortcut,
  })

  // 覆盖层全关上的那一刻把焦点还给棋盘。键盘不靠焦点活,但焦点留在触发键上会让
  // Space 再开一次那扇门,而 Space 在多数谜题里是走子键。要 effect 不要逐个
  // close 回调:两个 sheet 互相替换时不该收焦点,拖拽关闭和点 scrim 也得算上。
  const wasCovered = useRef(false)
  useEffect(() => {
    if (wasCovered.current && !covered) canvasRef.current?.focus()
    wasCovered.current = covered
  }, [covered])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== 'Escape') return
      // 发牌期间 Escape 什么都不关:拦截层挡得住指针,挡不住键盘,而关掉底下那张
      // sheet 会把还开着的参数 box 一起退掉,发牌回来就没地方落。
      if (dealer.dealing) return
      // 停靠的面板不归 Escape 管:它是布局的一部分,不是盖在棋盘上的东西。
      if (!sheetOpen) return
      setSheet(null)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, sheetOpen, dealer.dealing])

  const pressKey = useCallback(
    (key: Key<unknown>) => {
      acted()
      key.press(board.handle)
      canvasRef.current?.focus()
    },
    [acted, board.handle],
  )

  const arrowPad = game.arrows ? padButtons(game.arrows, board.view, board.handle) : null

  // 面板上撤两样。一、键区已经摆出来的那几条:同一个开关不在两处各占一行,依据是
  // 这一局真的显示出来的键(总开关关着、或上游改了 label 认不出就一条都不撤)。
  // 下标在两次借用之间稳:两边都是 midend_get_prefs() 的整表。二、裸字母快捷键那条:
  // 它归全局设置管(useShortcuts),开局压在存档上面,留着这一行会是个会撒谎的勾
  // ——点得动、下次开局又被压回去。撤空了整段不画(PuzzleMenu 自己判 length)。
  // memo 是必需的,不是优化:裸字母那条每个游戏都在,所以每次都会滤掉东西、每次都
  // 造新数组。这个页面每次重渲染(readPrefs 一路的 setState 很勤)都要走到这儿,
  // 不 memo 就每次给 ConfigFields 递一份新的 spec。
  const panelled = useMemo(() => {
    if (inline?.kind !== 'prefs') return null
    const fronted = new Set<number>()
    for (const key of keys) if (key.fronts !== undefined) fronted.add(key.fronts)
    const left = inline.spec.controls.filter(
      (control, i) => !fronted.has(i) && control.label !== SHORTCUTS_LABEL,
    )
    const controls = game.prefs.panel(left)
    return controls === inline.spec.controls
      ? inline.spec
      : { ...inline.spec, controls: [...controls] }
  }, [inline, keys, game])

  // 面板的内容和壳分开:内容只有一份,壳按宽度选。换壳(宽窄切换)内容会跟着重挂,
  // 各面板自己在挂载时要一份 config box、卸载时把挂着的退掉。
  const content =
    shown === 'types' && engine.presets ? (
      <PuzzleTypes
        presets={engine.presets}
        selected={engine.selected}
        standard={engine.standard}
        custom={inline?.kind === 'custom' ? inline.spec : null}
        declared={game.types.custom}
        customError={inlineError}
        docked={docked}
        // 不抢先把选中项挪过去:发牌可能被取消,那时引擎的参数一动没动,抢先
        // 挪过去就成了一个和棋盘对不上的勾。接手之后 load_game 会调
        // select_appropriate_preset,选中项由引擎自己报回来。
        // 参数表常驻,发牌全程开着的那份 box 装的是旧参数:发完再要一份,表里才是
        // 引擎此刻的参数(取消、失败也一样,要回来的就是原值)。busy 是别人的发牌
        // 在路上,由它收尾。
        onSelectPreset={(value) => {
          void deal({ kind: 'preset', index: value }, (a) => a.selectPreset(value)).then(
            (status) => {
              if (status !== null && status !== 'busy') refreshInline('custom')
            },
          )
        }}
        onOpenCustom={() => openInline('custom')}
        onCommitCustom={commitInline}
        onAbandon={abandonInline}
        onSettle={settle}
      />
    ) : shown === 'menu' ? (
      <PuzzleMenu
        canSolve={engine.canSolve}
        permalink={permalink}
        prefs={panelled}
        prefsError={inlineError}
        onOpenPrefs={() => openInline('prefs')}
        onCommitPrefs={commitInline}
        onAction={(action) => {
          // 三个动作里只有 newGame 会走到 midend_new_game;restart/solve 不发牌。
          if (action === 'newGame') deal({ kind: 'newGame' }, (a) => a.newGame())
          else act((a) => a[action]())
          // sheet 点完就收;停靠的面板是常驻的,留着。
          if (!wide) setSheet(null)
        }}
        onAbandon={abandonInline}
        onSettle={settle}
      />
    ) : null

  return (
    <div
      className="puzzle"
      data-ready={ready}
      data-dock={docked || undefined}
      data-arrows={arrows ? 'true' : undefined}
    >
      <header className="puzzle-bar">
        <h1>
          <button
            type="button"
            className="puzzle-title"
            onClick={showGallery}
            aria-label={`${title} — ${t.puzzle.switcher}`}
          >
            <span>{title}</span>
            <Icon name="caret" size={18} />
          </button>
        </h1>
        <span
          className="puzzle-status"
          data-filled={!!engine.status}
          aria-live="polite"
          {...(engine.status ? holdToAsk(engine.status) : {})}
        >
          {engine.status}
        </span>
        <ThemeToggle className="puzzle-icon" />
        <button
          type="button"
          className="puzzle-icon"
          aria-label={t.puzzle.help}
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen(true)}
        >
          <Icon name="help" />
        </button>
      </header>

      <div className="puzzle-board" ref={areaRef}>
        {error && (
          <Notice
            floating
            text={error === START_FAILED ? t.puzzle.error : error}
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
          className="puzzle-canvas"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          {...pointer}
        />
        {outcome.over && (
          <div className="puzzle-over" role="group" aria-label={t.puzzle.over}>
            <button
              type="button"
              className="is-primary"
              onClick={() => {
                outcome.dismiss()
                deal({ kind: 'newGame' }, (a) => a.newGame())
              }}
            >
              <Icon name="add" />
              {t.menu.newGame}
            </button>
            <button type="button" onClick={outcome.dismiss}>
              <Icon name="close" />
              {t.close}
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
        typesOpen={shown === 'types'}
        menuOpen={shown === 'menu'}
        dock={wide}
        holdToAsk={holdToAsk}
        wasHeld={wasHeld}
        onUndo={() => act((a) => a.undo())}
        onRedo={() => act((a) => a.redo())}
        onTypes={() => showPanel(shown === 'types' ? null : 'types')}
        onMenu={() => showPanel(shown === 'menu' ? null : 'menu')}
        onPress={(key) => {
          acted()
          key.press()
          canvasRef.current?.focus()
        }}
      />

      <HoldTip tip={tip} />

      {helpOpen && (
        <Dialog
          label={`${t.puzzle.help} — ${title}`}
          title={t.puzzle.help}
          onClose={closeHelp}
          className="dialog-help"
        >
          <img
            className="help-art"
            src={`/howto/${game.pages.howto}-${theme}.png`}
            alt={fill(t.puzzle.picture, { name: title })}
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
                {t.puzzle.fullInstructions}
              </a>
            </p>
          </div>
        </Dialog>
      )}

      {/* 内容等引擎活了再挂:面板一挂上就要 config box,引擎没起来那一次会落空,
          而且不会有第二次。停靠的壳不等——它撑着那 360 宽,棋盘要按它量尺寸。 */}
      {shown &&
        (wide ? (
          <Dock title={shown === 'types' ? t.types.title : t.puzzle.menu} onClose={closePanel}>
            {ready && content}
          </Dock>
        ) : (
          <Sheet label={shown === 'types' ? t.types.title : t.menu.title} onClose={closePanel}>
            {ready && content}
          </Sheet>
        ))}

      {dialog && apiRef.current && (
        <PuzzleDialog
          spec={dialog}
          onOk={() => apiRef.current?.dialogOk()}
          onCancel={() => apiRef.current?.dialogCancel()}
        />
      )}

      {dealer.dealing && (
        <PuzzleDealing waiting={dealer.waiting} onCancel={dealer.cancel} />
      )}
    </div>
  )
}
