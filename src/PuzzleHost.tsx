import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Dialog from './Dialog'
import ErrorNote from './ErrorNote'
import Icon from './Icon'
import Introduction from './Introduction'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import ThemeToggle from './ThemeToggle'
import { createPuzzle } from './engine/createPuzzle'
import {
  asMaybes,
  buries,
  clears,
  cursorKeys,
  dragWalked,
  faceOf,
  holding,
  laid,
  overwrites,
  inMenu,
  HOLD_BUTTON,
  keysFor,
  heads,
  movesEightWays,
  opener,
  opens,
  READS_PREFS,
  offersArrows,
  shovesTiles,
  silent,
  wakesCursor,
  wouldSend,
} from './engine/keys'
import type { KeyLabels } from './engine/keys'
import { rolls } from './engine/cube'
import { clearMarks, fillMarks, pending, placeSingles, remaining } from './engine/marks'
import { clueAt, mapSize, paintRegion, readClues, stepCursor } from './engine/map'
import { squareAt, tentsGrid } from './engine/tents'
import type { Square } from './engine/tents'
import type { Clues, Paint, Spot } from './engine/map'
import {
  alreadySolved,
  clearSave,
  isPlayed,
  markIntroduced,
  markSolved,
  owesIntroduction,
  readSave,
  setPlaying,
  writeRecent,
  writeSave,
} from './engine/saves'
import { usedSolver } from './engine/solved'
import type { CanvasRenderer } from './engine/renderer'
import { readStand, type Stand } from './engine/palisade'
import type {
  DialogControl,
  DialogSpec,
  KeyAction,
  KeyLabel,
  Preset,
  PuzzleApi,
} from './engine/types'
import { openManual } from './DocViewer'
import { docHref, useLang, useStrings } from './i18n'
import { showGallery } from './view'
import { useArrows } from './useArrows'
import { useHelp } from './useHelp'
import { HoldTip, useHoldTip } from './useHoldTip'
import { useResolvedTheme } from './useTheme'
import { usePuzzleFit } from './usePuzzleFit'
import { usePuzzlePointer } from './usePuzzlePointer'

const START_FAILED = '\0start'

const CUSTOM_PRESET = -1

const SHORTCUT_KEYS = /^[urn]$/i

const ACTIONS: Record<KeyAction, (save: string) => string | null> = {
  possible: fillMarks,
  single: placeSingles,
  blank: clearMarks,
}

const NUMPAD = 3

const ARROWS = [
  { dir: 'up', key: 'ArrowUp', where: 0, icon: 'arrowUp', shove: 'pushUp', sweep: 'sweepUp' },
  { dir: 'left', key: 'ArrowLeft', where: 0, icon: 'arrowLeft', shove: 'pushLeft', sweep: 'sweepLeft' },
  { dir: 'down', key: 'ArrowDown', where: 0, icon: 'arrowDown', shove: 'pushDown', sweep: 'sweepDown' },
  { dir: 'right', key: 'ArrowRight', where: 0, icon: 'arrowRight', shove: 'pushRight', sweep: 'sweepRight' },
] as const

const DIAGONALS = [
  { dir: 'upLeft', key: '7', where: NUMPAD, icon: 'arrowUpLeft' },
  { dir: 'upRight', key: '9', where: NUMPAD, icon: 'arrowUpRight' },
  { dir: 'downLeft', key: '1', where: NUMPAD, icon: 'arrowDownLeft' },
  { dir: 'downRight', key: '3', where: NUMPAD, icon: 'arrowDownRight' },
] as const

const ACT = ['first', 'second', 'third', 'fourth'] as const

const values = (controls: readonly DialogControl[]) =>
  JSON.stringify(controls.map((c) => c.value))

const NO_SWATCHES: ReadonlyMap<number, string> = new Map()

type InlineKind = 'custom' | 'prefs'
type Inline = { kind: InlineKind; spec: DialogSpec }

const ask = (api: PuzzleApi, kind: InlineKind) =>
  kind === 'custom' ? api.selectPreset(CUSTOM_PRESET) : api.preferences()

type TextKind = 'desc' | 'seed'

export default function PuzzleHost({
  name,
  title,
  objective,
}: {
  name: string
  title: string
  objective: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<PuzzleApi | null>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const startedRef = useRef(false)
  const effectAlive = useRef(false)
  const liveRef = useRef(true)

  const [status, setStatus] = useState<string | null>(null)
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [selected, setSelected] = useState(0)
  const [standard, setStandard] = useState<number | null>(null)
  const [canSolve, setCanSolve] = useState(true)
  const [undoRedo, setUndoRedo] = useState({ undo: false, redo: false })
  const [labels, setLabels] = useState<KeyLabels>({ enter: '', space: '' })
  const [awake, setAwake] = useState(false)
  const [opened, setOpened] = useState<string | null>(null)
  const [walked, setWalked] = useState(false)
  const [stand, setStand] = useState<Stand | undefined>(undefined)
  const labelsRef = useRef<KeyLabels>({ enter: '', space: '' })
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [permalink, setPermalink] = useState<{ desc: string; seed: string | null }>()
  const [prefs, setPrefs] = useState<readonly DialogControl[]>([])
  const wanted = useArrows()
  const arrows = wanted && offersArrows(name)
  const spot = useRef<Spot>({ x: 0, y: 0 })
  const [typed, setTyped] = useState(0)
  const [maybe, setMaybe] = useState(false)
  const [sweeping, setSweeping] = useState(false)
  const [brush, setBrush] = useState(0)
  const acts = useMemo(() => cursorKeys(name, prefs), [name, prefs])
  const brushAt = acts[brush]?.brush ? brush : acts.findIndex((k) => k.brush)
  const stroking = brushAt >= 0 ? acts[brushAt].brush : undefined
  const picksBrush = acts.filter((k) => k.brush).length > 1
  const desc = permalink?.desc
  const grid = useMemo(
    () =>
      !desc
        ? null
        : name === 'map'
          ? mapSize(desc.split(':')[0])
          :
            name === 'tents'
            ? tentsGrid(desc.split(':')[0])
            : null,
    [name, desc],
  )
  const clues = useRef<Clues | null>(null)
  const [onClue, setOnClue] = useState(false)
  const [held, setHeld] = useState<Square | null>(null)
  const [primed, setPrimed] = useState<number | null>(null)
  const [left, setLeft] = useState<Map<number, number> | null>(null)
  const [rolling, setRolls] = useState<Set<string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // 读棋盘要 load 存档,而 midend_deserialise 又让 onPermalinks 发新对象(desc 不变):
  // 这条链只能以 desc 字符串为依赖,reading 挡的就是这个环。「补全」成对象依赖或
  // 删掉守卫,每次按键都会清空 clues、重置光标。
  const reading = useRef(false)
  useEffect(() => {
    const api = apiRef.current
    const renderer = rendererRef.current
    if (reading.current) return
    clues.current = null
    setOnClue(false)
    if (!ready || !api || !renderer || !grid || !desc) return
    reading.current = true
    try {
      clues.current = readClues(api, renderer, grid)
    } finally {
      reading.current = false
    }
  }, [desc, grid, ready])

  const [menuOpen, setMenuOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [intro, setIntro] = useState(false)

  const [inline, setInline] = useState<Inline | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const inlinePending = useRef<InlineKind | null>(null)
  const inlineRef = useRef<Inline | null>(null)
  const inlineBaseline = useRef('')

  const borrowed = useRef<{ spec: DialogSpec | null; error: string | null } | null>(null)
  const [textError, setTextError] = useState<{ kind: TextKind; message: string } | null>(null)

  const help = useHelp(name)
  const theme = useResolvedTheme()
  const t = useStrings()
  const [lang] = useLang()
  const themeRef = useRef(theme)
  themeRef.current = theme

  const armed = useRef(false)
  const restoring = useRef(false)
  const savePending = useRef(false)
  const acted = useCallback(() => {
    armed.current = true
    setError(null)
  }, [])

  // 当前这一局的 desc,给完成判定当身份用。要 ref 不要 state:判定跑在
  // onUndoRedo 里,那时 setPermalink 排的这一轮渲染还没落地。
  const here = useRef<string | null>(null)
  const wasStatus = useRef<{ desc: string; status: number } | null>(null)
  // 会话内的闩锁不是 alreadySolved 的冗余:localStorage 被禁(隐私模式/配额)时那边
  // 读回永远是「没报过」,undo 再 redo 就会一路重报。
  const reported = useRef<string | null>(null)
  const [over, setOver] = useState(false)

  // 一局走到头(解出或输掉)时抬起收尾浮层,玩家自己解出时再记一笔。触发点是
  // onUndoRedo——emcc.c 的 post_move() 在每次输入后都发它,是 JS 侧唯一
  // 「状态可能变了」的信号。
  //
  // 两件事共用一次 status(),但闸门不同:浮层认「结束」,所以求解器解出的也抬;
  // 记录认「玩家自己解出」,求解器解出的不算。
  //
  // 一律只认沿,不认状态:一局的第一次观察永远不算,否则读档读到一局已经结束的、
  // 以及启动时「随机局(0) → 读档后的结束局(±1)」这一跳都会误触发。回到进行中
  // (undo 回去)就重新武装,浮层也跟着收起来——关掉之后不再自己冒出来,靠的就是
  // 「已经过了那道沿」。
  const checkStatus = useCallback(() => {
    const api = apiRef.current
    // 旧引擎没有这个洞:sw.js 让老用户第一次访问跑上一版,这时安静降级。
    if (!api?.status) return
    const desc = here.current
    if (!desc) return
    const now = api.status()
    const seen = wasStatus.current
    wasStatus.current = { desc, status: now }
    if (now === 0) {
      setOver(false)
      return
    }
    if (seen?.desc !== desc || seen.status !== 0) return
    setOver(true)
    if (now !== 1) return
    if (reported.current === desc || alreadySolved(name, desc)) return
    if (usedSolver(api.saveGame())) return
    reported.current = desc
    markSolved(name, desc)
  }, [name])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 3000)
    return () => window.clearTimeout(timer)
  }, [error])

  const queueSave = useCallback(() => {
    if (!armed.current || savePending.current) return
    savePending.current = true
    queueMicrotask(() => {
      savePending.current = false
      const api = apiRef.current
      if (api) writeSave(name, api.saveGame())
    })
  }, [name])

  const countLeft = useCallback(() => {
    const api = apiRef.current
    setLeft(api ? remaining(api.saveGame()) : null)
  }, [])

  const readRolls = useCallback(() => {
    const api = apiRef.current
    setRolls(name === 'cube' && api ? rolls(api.saveGame()) : null)
  }, [name])

  const readHeld = useCallback(() => {
    const api = apiRef.current
    setHeld(name === 'tents' && api ? squareAt(api.saveGame(), spot.current) : null)
  }, [name])

  useEffect(() => {
    writeRecent(name)
    setPlaying(true)
  }, [name])

  useEffect(() => {
    if (ready && owesIntroduction(name)) setIntro(true)
  }, [ready, name])

  // StrictMode 在开发下同步跑 effect→cleanup→effect,而 wasm 没有 teardown:
  // startedRef 挡住第二次启动;cleanup 用 microtask 缓期执行——真卸载没有下一次
  // 运行来翻案,被 StrictMode 立刻复活的则什么都不杀。
  useEffect(() => {
    effectAlive.current = true
    liveRef.current = true
    if (startedRef.current) return
    startedRef.current = true

    const canvas = canvasRef.current
    const area = areaRef.current
    if (!canvas || !area) return

    const saved = readSave(name)
    let restored = true

    createPuzzle({
      name,
      canvas,
      dark: themeRef.current === 'dark',
      callbacks: {
        onReady(list, api) {
          apiRef.current = api
          if (!liveRef.current) return api.stopTimer()
          window.__puzzle = api
          if (saved) {
            restoring.current = true
            try {
              api.loadGame(saved)
            } finally {
              restoring.current = false
            }
            // 没走过子的存档也要先 load 再用 newGame 盖掉,不能跳过 load:
            // 存档里还有玩家选的参数(尺寸、难度),参数要活下来,棋盘不留。
            if (restored && !isPlayed(saved)) api.newGame()
          }
          setPresets(list)
          setReady(true)
          countLeft()
          readRolls()
          readHeld()
          // 补一次基线:main() 里的 post_move() 早于 js_post_init(),那一次
          // onUndoRedo 到达时 apiRef 还是空的,checkStatus 什么都没记下。不补的话
          // 「这一局的第一次观察」会落在玩家的第一个动作上,那个动作要是直接把
          // 局面走完(比如开局就求解),沿就丢了。
          checkStatus()
        },
        onError: (message) => {
          if (restoring.current) {
            restored = false
            clearSave(name)
            console.warn(`discarded a stale save for ${name}:`, message)
            return
          }
          if (borrowed.current) borrowed.current.error = message
          else if (inlineRef.current) setInlineError(message)
          else setError(message)
        },
        onStatus: setStatus,
        onUndoRedo: (undo, redo) => {
          setUndoRedo({ undo, redo })
          queueSave()
          countLeft()
          readRolls()
          readHeld()
          checkStatus()
        },
        // emcc.c 先报 CURSOR_SELECT2 再报 CURSOR_SELECT,这里的形参序(space, enter)
        // 是故意的;types.ts 里叫 (lsk, csk) 是同一对的另一套名字,不是谁写反了。
        onKeyLabels: (space, enter) => {
          labelsRef.current = { enter, space }
          setOpened((was) => opener(name, { enter, space }, was))
          setLabels({ enter, space })
        },
        onPermalinks: (desc, seed) => {
          here.current = desc
          setPermalink({ desc, seed })
          queueSave()
          setAwake(false)
          spot.current = { x: 0, y: 0 }
          setTyped(0)
        },
        // 第一次报的一定是默认预设:emcc.c 建菜单时先调 select_appropriate_preset(),
        // 读存档和玩家选择都在其后,所以「第一个赢」拿到的就是 default_params()。
        // 四十个游戏里二十个的默认不是列表第一项,这个值不能猜。
        onPresetSelected: (index) => {
          setStandard((first) => first ?? index)
          setSelected(index)
        },
        onSolveRemoved: () => setCanSolve(false),
        onDialog: (spec) => {
          // game ID 和 seed 也是 config box,但只有一个字段、值早已在手:
          // 借用而不显示,box 的答案在路过这里时被截下。
          if (spec && borrowed.current) {
            borrowed.current.spec = spec
            return
          }
          const kind = inlinePending.current
          if (spec && kind) {
            inlinePending.current = null
            inlineRef.current = { kind, spec }
            inlineBaseline.current = values(spec.controls)
            setInlineError(null)
            setInline({ kind, spec })
            if (kind === 'prefs') setPrefs(spec.controls)
            return
          }
          if (!spec && inlineRef.current) {
            inlineRef.current = null
            setInlineError(null)
            setInline(null)
            return
          }
          setDialog(spec)
        },
        onTimer: (running) => {
          window.__animating = running
        },
      },
    })
      .then(({ renderer }) => {
        rendererRef.current = renderer
      })
      .catch((err) => {
        if (!liveRef.current) return
        console.error(`could not start ${name}`, err)
        setError(START_FAILED)
      })

    return () => {
      effectAlive.current = false
      queueMicrotask(() => {
        if (effectAlive.current) return
        liveRef.current = false
        apiRef.current?.stopTimer()
        delete window.__puzzle
      })
    }
  }, [name])

  const keys = useMemo(() => {
    const all = permalink ? keysFor(name, decodeURIComponent(permalink.desc), prefs) : []
    // 关掉方向键只藏三类。以前是按游戏名把整份键表丢掉(guess)或按 aimed 过滤
    // (map),前一种把 guess 的提示键——四类,和方向键没关系——也一起埋了。
    const shown = wanted ? all : all.filter((k) => k.kind !== 'aim')
    return maybe ? asMaybes(shown) : shown
  }, [maybe, name, permalink, prefs, wanted])

  usePuzzleFit(
    areaRef,
    apiRef,
    rendererRef,
    ready,
    permalink?.desc.split(':')[0] ?? '',
  )
  const pointer = usePuzzlePointer(apiRef, rendererRef, HOLD_BUTTON[name])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !ready) return
    if (!renderer.setDark(theme === 'dark')) return
    // rescale 而不是 resize:resize_puzzle 只在算出的尺寸变了才重画,这里尺寸没变。
    apiRef.current?.rescale()
  }, [theme, ready])

  const [swatches, setSwatches] = useState<ReadonlyMap<number, string>>(NO_SWATCHES)
  // 必须是 effect,且声明在上面翻主题的 effect 之后:那个 effect 才把 renderer 的
  // 调色表翻面,effect 按声明顺序跑,这里是新颜色存在的第一刻;memo 会读到旧主题。
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !ready) return
    const next = new Map<number, string>()
    for (const key of keys)
      for (const slot of [key.slot, key.ink]) {
        if (slot === undefined) continue
        const css = renderer.colour(slot)
        if (css) next.set(slot, css)
      }
    setSwatches((was) => (was.size === 0 && next.size === 0 ? was : next))
  }, [keys, theme, ready])

  const act = useCallback(
    (fn: (api: PuzzleApi) => void) => {
      if (!apiRef.current || dialog) return
      acted()
      fn(apiRef.current)
      setTyped(0)
      canvasRef.current?.focus()
    },
    [dialog, acted],
  )

  const openInline = useCallback(
    (kind: InlineKind) => {
      const api = apiRef.current
      if (!api || dialog || inlineRef.current) return
      // 后端只有一个 config box(game ID、参数、偏好共用),打开了就必须有人回答;
      // pending 标签先立好,说明这次要的是哪一个。
      inlinePending.current = kind
      ask(api, kind)
    },
    [dialog],
  )

  const closeInline = useCallback(() => {
    apiRef.current?.dialogCancel()
  }, [])

  const commitInline = useCallback(() => {
    const api = apiRef.current
    const open = inlineRef.current
    if (!api || !open) return
    if (values(open.spec.controls) === inlineBaseline.current) return
    acted()
    setInlineError(null)
    api.dialogOk()
    if (!inlineRef.current) {
      inlinePending.current = open.kind
      ask(api, open.kind)
    }
  }, [])

  const submitText = useCallback((kind: TextKind, text: string) => {
    const api = apiRef.current
    if (!api) return
    acted()
    const resume = inlineRef.current?.kind ?? null
    if (resume) api.dialogCancel()

    borrowed.current = { spec: null, error: null }
    if (kind === 'desc') api.enterGameId()
    else api.enterSeed()
    const { spec } = borrowed.current
    if (spec) {
      spec.controls[0].value = text
      api.dialogOk()
      if (borrowed.current.error) api.dialogCancel()
    }
    const message = borrowed.current.error
    borrowed.current = null
    setTextError(message ? { kind, message } : null)

    if (resume) {
      inlinePending.current = resume
      ask(api, resume)
    }
  }, [])

  const readPrefs = useCallback(() => {
    const api = apiRef.current
    if (!api || dialog || inlineRef.current) return
    borrowed.current = { spec: null, error: null }
    api.preferences()
    const { spec } = borrowed.current
    if (spec) api.dialogCancel()
    borrowed.current = null
    if (spec)
      setPrefs((was) => (values(was) === values(spec.controls) ? was : spec.controls))
  }, [dialog])

  useEffect(() => {
    if (ready && READS_PREFS.has(name)) readPrefs()
  }, [ready, name, readPrefs])

  const closeTypes = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
    setTypesOpen(false)
  }, [])

  const closeMenu = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
    setMenuOpen(false)
  }, [])

  const closeHelp = useCallback(() => setHelpOpen(false), [])

  const { tip, holdToAsk, wasHeld } = useHoldTip()

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    acted()
    const plain = !e.shiftKey && !e.ctrlKey
    if (plain && wakesCursor(name, e.key)) setAwake(true)
    if (plain && opens(name, e.key, labelsRef.current)) setOpened(e.key)
    if (plain) {
      const walk = dragWalked(name, e.key)
      if (walk !== null) setWalked(walk)
    }
    if (grid && plain) spot.current = stepCursor(spot.current, e.key, grid)
    if (plain && heads(name)) {
      if (e.key === 'ArrowLeft') setTyped((n) => Math.max(n - 1, 0))
      else if (e.key === 'ArrowRight' || /^[0-9]$/.test(e.key)) setTyped((n) => n + 1)
    }
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
    if (READS_PREFS.has(name)) readPrefs()
  }, [acted, grid, name, readPrefs])

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

  const markAction = useCallback(
    (action: KeyAction) => {
      const api = apiRef.current
      if (!api) return
      const next = ACTIONS[action](api.saveGame())
      if (!next) return
      acted()
      const held = pending(next)
      api.loadGame(held ?? next)
      if (held) api.redo()
    },
    [acted],
  )

  const dead = useCallback(
    (key: KeyLabel) =>
      (key.needs !== undefined && labels.enter !== key.needs) ||
      (key.behind !== undefined && typed === 0) ||
      (key.paints !== undefined && (!awake || onClue)),
    [awake, labels.enter, onClue, typed],
  )

  const paint = useCallback((p: Paint) => {
    const api = apiRef.current
    if (!api || !awake) return
    const at = spot.current
    paintRegion(api, at, p)
    spot.current = at
    setAwake(true)
  }, [awake])

  const pressKey = useCallback((key: KeyLabel) => {
    const api = apiRef.current
    if (!api) return
    if (key.action) {
      markAction(key.action)
      canvasRef.current?.focus()
      return
    }
    acted()
    if (key.paints) {
      paint(key.paints)
      canvasRef.current?.focus()
      return
    }
    const send = (sent: string, code = 0) => {
      if (wakesCursor(name, sent)) setAwake(true)
      return api.key(code, sent, '', 0, 0, 0)
    }
    if (key.behind) {
      if (typed > 0) {
        send(key.behind.step)
        send('Backspace', 8)
        setTyped((n) => Math.max(n - 1, 0))
      }
      canvasRef.current?.focus()
      return
    }
    if (key.aims) {
      for (let i = 0; i < key.aims.span; i++) send(key.aims.home)
      for (let i = 0; i < key.aims.at; i++) send(key.aims.step)
    }
    send(String.fromCharCode(key.button))
    if (key.advances !== undefined) setTyped((n) => Math.min(n + 1, key.advances!))
    if (key.restarts) setTyped(0)
    canvasRef.current?.focus()
  }, [acted, markAction, name, paint, typed])

  const sendKey = useCallback(
    (key: string, where = 0, mod?: { shift?: true; ctrl?: true }) => {
      const api = apiRef.current
      if (!api) return
      acted()
      if (wakesCursor(name, key)) setAwake(true)
      if (!mod && opens(name, key, labelsRef.current)) setOpened(key)
      if (!mod) {
        const walk = dragWalked(name, key)
        if (walk !== null) setWalked(walk)
      }
      if (grid) {
        spot.current = stepCursor(spot.current, key, grid)
        setOnClue(clues.current ? clueAt(clues.current, spot.current, key) : false)
      }
      api.key(0, key, '', where, mod?.shift ? 1 : 0, mod?.ctrl ? 1 : 0)
      canvasRef.current?.focus()
    },
    [acted, grid, name],
  )


  useEffect(() => {
    const renderer = rendererRef.current
    if (!ready || !renderer || name !== 'palisade') return
    renderer.watch((tape) => {
      const seen = readStand(tape)
      if (seen) setStand(seen)
    })
    return () => renderer.watch(null)
  }, [name, ready])

  const asleep = silent(labels)
  const painting = sweeping && !asleep

  const shownKeys = acts.map((cursor) =>
    inMenu(name, cursor, { ...labels, opened: opened ?? undefined, walked, stand }, awake),
  )
  const cellOf = shownKeys.reduce<(string | undefined)[]>((out, shown) => {
    out.push(shown ? ACT[out.filter(Boolean).length] : undefined)
    return out
  }, [])
  const keyCount = shownKeys.filter(Boolean).length

  return (
    <div className="play" data-ready={ready} data-arrows={arrows ? 'true' : undefined}>
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
          data-filled={!!status}
          aria-live="polite"
          {...(status ? holdToAsk(status) : {})}
        >
          {status}
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
          <ErrorNote
            floating
            text={error === START_FAILED ? t.play.error : error}
          />
        )}
        {intro && !error && (
          <Introduction
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
            setAwake(false)
            setTyped(0)
          }}
          className="host-board"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          {...pointer}
        />
        {over && (
          <div className="play-over" role="group" aria-label={t.play.over}>
            <button
              type="button"
              className="is-primary"
              onClick={() => {
                setOver(false)
                act((a) => a.newGame())
              }}
            >
              <Icon name="add" />
              {t.menu.newGame}
            </button>
            <button type="button" onClick={() => setOver(false)}>
              <Icon name="close" />
              {t.play.close}
            </button>
          </div>
        )}
      </div>

      <PuzzleKeypad
        keys={keys}
        left={left}
        swatches={swatches}
        dead={dead}
        onPress={pressKey}
      />

      <nav className="play-actions">
        <div className="play-acts">
          <button
            type="button"
            aria-label={t.play.undo}
            disabled={!undoRedo.undo}
            {...holdToAsk(t.play.undo)}
            onClick={() => {
              if (wasHeld()) return
              act((a) => a.undo())
            }}
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            aria-label={t.play.redo}
            disabled={!undoRedo.redo}
            {...holdToAsk(t.play.redo)}
            onClick={() => {
              if (wasHeld()) return
              act((a) => a.redo())
            }}
          >
            <Icon name="redo" />
          </button>
          {presets && (
            <button
              type="button"
              aria-label={t.types.title}
              aria-haspopup="dialog"
              aria-expanded={typesOpen}
              {...holdToAsk(t.types.title)}
              onClick={() => {
                if (wasHeld()) return
                closeMenu()
                setTypesOpen(true)
              }}
            >
              <Icon name="type" />
            </button>
          )}
          <button
            type="button"
            className="is-menu"
            aria-label={t.play.menu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            {...holdToAsk(t.play.menu)}
            onClick={() => {
              if (wasHeld()) return
              closeTypes()
              setTextError(null)
              setMenuOpen(true)
            }}
          >
            <Icon name="menu" />
          </button>
        </div>

        {arrows && (
          <div
            className="play-arrows"
            data-ways={movesEightWays(name) ? '8' : undefined}
            data-keys={keyCount >= 3 ? String(keyCount) : undefined}
            role="group"
            aria-label={t.play.arrows.group}
          >
            {[...ARROWS, ...(movesEightWays(name) ? DIAGONALS : [])].map((arrow) => {
              const stroke = painting ? stroking : undefined
              const { dir, key, where } = arrow
              const shoving =
                'shove' in arrow && shovesTiles(name, labels) ? arrow : null
              const marking = !shoving && stroke && 'sweep' in arrow ? arrow : null
              const icon = shoving ? shoving.shove : marking ? marking.sweep : arrow.icon
              return (
              <button
                key={dir}
                type="button"
                data-dir={dir}
                aria-label={
                  shoving
                    ? t.play.arrows.shove[shoving.dir]
                    : marking
                      ? t.play.arrows.paint[marking.dir]
                      : t.play.arrows[dir]
                }
                disabled={rolling ? !rolling.has(key) : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const armed = primed === null ? null : (acts[primed]?.primes ?? null)
                  const before = armed ? apiRef.current?.saveGame() : undefined
                  sendKey(key, where, armed ?? stroke)
                  if (armed && apiRef.current?.saveGame() !== before) setPrimed(null)
                }}
              >
                <Icon name={icon} />
              </button>
              )
            })}

            {acts.map((cursor, i) => {
              if (!shownKeys[i]) return null
              const off = primed !== null && i !== primed
              if (cursor.primes) {
                const armed = primed === i
                const blind = !labels.enter && !labels.space
                return (
                  <button
                    key={cursor.icon}
                    type="button"
                    data-act={cellOf[i]}
                    data-off={off || undefined}
                    data-on={armed || undefined}
                    aria-pressed={armed}
                    disabled={blind}
                    aria-label={t.play.cursor[cursor.says]}
                    onMouseDown={(e) => e.preventDefault()}
                    {...holdToAsk(t.play.cursor[cursor.says])}
                    onClick={() => {
                      if (wasHeld()) return
                      acted()
                      setPrimed((was) => (was === i ? null : i))
                      canvasRef.current?.focus()
                    }}
                  >
                    <Icon name={cursor.icon} />
                  </button>
                )
              }
              if (cursor.sweeps) {
                return (
                  <button
                    key={cursor.icon}
                    type="button"
                    data-act="sweep"
                    data-off={off || undefined}
                    data-on={painting || undefined}
                    aria-pressed={painting}
                    disabled={asleep}
                    aria-label={t.play.cursor[cursor.says]}
                    onMouseDown={(e) => e.preventDefault()}
                    {...holdToAsk(t.play.cursor[cursor.says])}
                    onClick={() => {
                      if (wasHeld()) return
                      acted()
                      setSweeping((was) => !was)
                      canvasRef.current?.focus()
                    }}
                  >
                    <Icon name={cursor.icon} />
                  </button>
                )
              }
              if (cursor.paints || cursor.arms) {
                const on = cursor.arms ? maybe && awake : false
                return (
                  <button
                    key={cursor.icon}
                    type="button"
                    data-act={cellOf[i]}
                    data-off={off || undefined}
                    data-on={on || undefined}
                    aria-pressed={cursor.arms ? on : undefined}
                    aria-label={t.play.cursor[cursor.says]}
                    disabled={!awake || (cursor.paints !== undefined && onClue)}
                    onMouseDown={(e) => e.preventDefault()}
                    {...holdToAsk(t.play.cursor[cursor.says])}
                    onClick={() => {
                      if (wasHeld()) return
                      acted()
                      if (cursor.paints) paint(cursor.paints)
                      else setMaybe((was) => !was)
                      canvasRef.current?.focus()
                    }}
                  >
                    <Icon name={cursor.icon} />
                  </button>
                )
              }
              const { icon, says, on } = faceOf(name, cursor, { ...labels, opened: opened ?? undefined, walked, stand }, awake)
              const set =
                on ||
                holding(cursor, labels) ||
                laid(cursor, { ...labels, stand }) ||
                (!!cursor.switches && held === cursor.key)
              const said = t.play.cursor[says]
              const key = wouldSend(name, cursor, { ...labels, opened: opened ?? undefined, walked, stand }, awake)
              return (
                <button
                  key={cursor.does ?? cursor.key}
                  type="button"
                  data-act={cellOf[i]}
                  data-off={off || undefined}
                  data-on={set || undefined}
                  data-brush={
                    painting && cursor.brush && picksBrush && i === brushAt ? 'true' : undefined
                  }
                  aria-pressed={
                    cursor.instead
                      ? set
                      : cursor.faces
                        ? !!on
                        : cursor.brush && picksBrush
                          ? painting && i === brushAt
                          : undefined
                  }
                  aria-label={said}
                  disabled={key === null && (!cursor.lit || asleep)}
                  {...holdToAsk(said)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (wasHeld()) return
                    if (cursor.brush) setBrush(i)
                    setPrimed(null)
                    if (key === null) return
                    const first = clears(cursor, labels)
                    if (first) {
                      sendKey(first)
                      const now = { ...labelsRef.current, opened: opened ?? undefined, walked, stand }
                      if (wouldSend(name, cursor, now, awake) === null) apiRef.current?.undo()
                      else sendKey(key)
                      return
                    }
                    sendKey(set && cursor.switches ? cursor.switches : key)
                    if (overwrites(cursor, labels)) sendKey(key)
                    if (buries(cursor, { ...labels, stand })) sendKey(key)
                  }}
                >
                  <Icon name={icon} />
                </button>
              )
            })}
          </div>
        )}
      </nav>

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
            src={`/howto/${name}-${theme}.png`}
            alt={t.play.picture(title)}
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
                href={docHref(lang, `${name}.html`)}
                onClick={(e) => {
                  e.preventDefault()
                  closeHelp()
                  openManual(`${name}.html`)
                }}
              >
                {t.play.fullInstructions}
              </a>
            </p>
          </div>
        </Dialog>
      )}

      {typesOpen && presets && (
        <PuzzleTypes
          presets={presets}
          selected={selected}
          standard={standard}
          custom={inline?.kind === 'custom' ? inline.spec : null}
          customError={inlineError}
          onSelectPreset={(value) => {
            setSelected(value)
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
          canSolve={canSolve}
          permalink={permalink}
          prefs={inline?.kind === 'prefs' ? inline.spec : null}
          prefsError={inlineError}
          onOpenPrefs={() => openInline('prefs')}
          onCommitPrefs={commitInline}
          textError={textError}
          onSubmitText={submitText}
          onAction={(action) => {
            if (inlineRef.current) apiRef.current?.dialogCancel()
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
