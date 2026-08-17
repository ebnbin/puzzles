import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import Dialog from './ui/Dialog'
import Icon from './ui/Icon'
import Notice from './ui/Notice'
import ThemeToggle from './ui/ThemeToggle'
import { createPuzzle } from './engine/createPuzzle'
// 写全 index:裸的 ./games 会被解析成 games.json。
import { gameOf } from './games/index'
import type {
  Armed,
  Board,
  Gate,
  Key,
  Labels,
  Saw,
  Stroke,
  View,
  Words,
} from './games/game'
import { keyOf } from './games/game'
import type { PadButton } from './games/util/pad'
import { padButtons } from './games/util/pad'
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
import type { CanvasRenderer, Drawn } from './engine/renderer'
import type {
  DialogControl,
  DialogSpec,
  Preset,
  PuzzleApi,
} from './engine/types'
import { openManual } from './DocViewer'
import { docHref, fill, useLang, useStrings } from './i18n'
import { showGallery } from './view'
import { useAid } from './useAid'
import { useArrows } from './useArrows'
import { useHelp } from './useHelp'
import HoldTip, { useHoldTip } from './ui/HoldTip'
import { useResolvedTheme } from './useTheme'
import { usePuzzleFit } from './usePuzzleFit'
import { usePuzzlePointer } from './usePuzzlePointer'

const START_FAILED = '\0start'

const CUSTOM_PRESET = -1

const SHORTCUT_KEYS = /^[urn]$/i

const values = (controls: readonly DialogControl[]) =>
  JSON.stringify(controls.map((c) => c.value))

const NO_SWATCHES: ReadonlyMap<number, string> = new Map()

const NO_LIT: ReadonlySet<string> = new Set()

type InlineKind = 'custom' | 'prefs'
type Inline = { kind: InlineKind; spec: DialogSpec }

const ask = (api: PuzzleApi, kind: InlineKind) =>
  kind === 'custom' ? api.selectPreset(CUSTOM_PRESET) : api.preferences()

type TextKind = 'desc' | 'seed'

const strokeArgs = (s: Stroke): [number, string, string, number, number, number] =>
  typeof s === 'string'
    ? [0, s, '', 0, 0, 0]
    : [0, s.key, '', s.pad ? 3 : 0, s.shift ? 1 : 0, s.ctrl ? 1 : 0]

export default function PuzzleHost({
  name,
  title,
  objective,
}: {
  name: string
  title: string
  objective: string
}) {
  // GamePage 已按 games.json 把过关,注册表和 games.json 的一致由构建期检查
  // 把守,这里不可能拿不到。
  const game = gameOf(name)
  if (!game) throw new Error(`no game registered as ${name}`)

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
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [permalink, setPermalink] = useState<{ desc: string; seed: string | null }>()
  const [prefs, setPrefs] = useState<readonly DialogControl[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // 每游戏状态只有这五项,全部由接口的通道喂:标签、事实、光标镜像、粘滞键、上膛。
  const [labels, setLabels] = useState<Labels>({ enter: '', space: '' })
  const labelsRef = useRef<Labels>({ enter: '', space: '' })
  const [facts, setFacts] = useState<unknown>(game.observe.init)
  const factsRef = useRef<unknown>(game.observe.init)
  const [awake, setAwake] = useState(false)
  const awakeRef = useRef(false)
  const [lit, setLit] = useState<ReadonlySet<string>>(NO_LIT)
  const litRef = useRef<ReadonlySet<string>>(NO_LIT)
  const [armed, setArmed] = useState<Armed | null>(null)
  const armedRef = useRef<Armed | null>(null)

  const mirrored = game.upstream.cursor.kind === 'mirrored'
  const wakeKeys = mirrored
    ? (game.upstream.cursor as { wakes: readonly string[] }).wakes
    : null

  const wanted = useArrows()
  const arrows = wanted && game.arrows !== null
  const helping = useAid()

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

  const help = useHelp(game.pages.help)
  const theme = useResolvedTheme()
  const t = useStrings()
  const [lang] = useLang()
  const themeRef = useRef(theme)
  themeRef.current = theme

  const words: Words = useMemo(() => ({ ...t.play, keys: t.keys }), [t])
  const wordsRef = useRef(words)
  wordsRef.current = words
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const armedSave = useRef(false)
  const restoring = useRef(false)
  const savePending = useRef(false)
  const acted = useCallback(() => {
    armedSave.current = true
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
    if (!armedSave.current || savePending.current) return
    savePending.current = true
    queueMicrotask(() => {
      savePending.current = false
      const api = apiRef.current
      if (api) writeSave(name, api.saveGame())
    })
  }, [name])

  useEffect(() => {
    writeRecent(name)
    setPlaying(true)
  }, [name])

  useEffect(() => {
    if (ready && owesIntroduction(name)) setIntro(true)
  }, [ready, name])

  // ------------------------------------------------------------ 观察与棋盘

  // 存档门里发生的一切不喂观察器:门内的载入/按键是探测和改写的机械动作,
  // 不是棋局事件;门关上之后如果真载入过存档,补一个 {moved}。
  const inGate = useRef(0)
  const gateLoaded = useRef(false)

  const see = useCallback(
    (saw: Saw) => {
      factsRef.current = game.observe.next(factsRef.current, saw)
      setFacts(factsRef.current)
    },
    [game],
  )

  const wake = useCallback(
    (key: string) => {
      if (!wakeKeys?.includes(key)) return
      awakeRef.current = true
      setAwake(true)
    },
    [wakeKeys],
  )

  const viewNow = useCallback(
    (): View<unknown> => ({
      labels: labelsRef.current,
      facts: factsRef.current,
      cursor: mirrored ? awakeRef.current : true,
      lit: litRef.current,
      armed: armedRef.current,
      prefs: prefsRef.current,
      words: wordsRef.current,
    }),
    [mirrored],
  )

  const gateOf = useCallback((api: PuzzleApi): Gate => {
    return {
      read: () => api.saveGame(),
      load: (text) => {
        gateLoaded.current = true
        api.loadGame(text)
      },
      send: (s) => {
        api.key(...strokeArgs(s))
      },
      redo: () => api.redo(),
      replay: (text) => {
        const renderer = rendererRef.current
        if (!renderer) return []
        renderer.record()
        let tape: Drawn[] = []
        try {
          api.loadGame(text)
        } finally {
          tape = renderer.stop()
        }
        return tape
      },
    }
  }, [])

  const board = useMemo(
    (): Board<unknown> => ({
      view: viewNow,
      send: (s) => {
        const api = apiRef.current
        if (!api) return
        acted()
        wake(keyOf(s))
        see({ sent: s, before: labelsRef.current })
        api.key(...strokeArgs(s))
      },
      gate: (run) => {
        const api = apiRef.current
        if (!api) throw new Error('gate before ready')
        if (inGate.current === 0) gateLoaded.current = false
        inGate.current += 1
        try {
          return run(gateOf(api))
        } finally {
          inGate.current -= 1
          if (inGate.current === 0 && gateLoaded.current) {
            acted()
            if (game.observe.saves) see({ moved: api.saveGame() })
          }
        }
      },
      undo: () => apiRef.current?.undo(),
      arm: (a) => {
        armedRef.current = a
        setArmed(a)
      },
      latch: (id, on) => {
        const next = new Set(litRef.current)
        if (on) next.add(id)
        else next.delete(id)
        litRef.current = next
        setLit(next)
      },
    }),
    [acted, game, gateOf, see, viewNow, wake],
  )

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
      spec: game.dark,
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
          setPresets(list && [...game.types.menu(list)])
          setReady(true)
          if (game.observe.saves) see({ moved: api.saveGame() })
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
          if (!inGate.current && game.observe.saves && apiRef.current)
            see({ moved: apiRef.current.saveGame() })
          checkStatus()
        },
        // emcc.c 先报 CURSOR_SELECT2 再报 CURSOR_SELECT,这里的形参序(space, enter)
        // 是故意的。已发布的胶水在两词相同时把 space 抹成空串,按 upstream.echoes
        // 在这里复原:接口内部只见双词。
        onKeyLabels: (blanked, enter) => {
          const space =
            blanked !== ''
              ? blanked
              : enter && game.upstream.echoes?.includes(enter)
                ? enter
                : ''
          labelsRef.current = { enter, space }
          if (!inGate.current) see({ spoke: labelsRef.current })
          setLabels(labelsRef.current)
        },
        onPermalinks: (desc, seed) => {
          here.current = desc
          setPermalink({ desc, seed })
          queueSave()
          if (!inGate.current) {
            awakeRef.current = false
            setAwake(false)
          }
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
    // game 由 name 唯一决定,GamePage 用 key 保证换游戏必然重挂载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  // 发牌事件:desc 换了才算新一局(restart 不换 desc、也不该重置观察)。放在
  // effect 里而不是 onPermalinks 回调里,是因为观察器可能借 gate 探测(map 的
  // 线索表要重放发牌),那是对引擎的重入,不能发生在引擎回调栈上。
  const dealtRef = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || !permalink) return
    const id = decodeURIComponent(permalink.desc)
    if (dealtRef.current === id) return
    dealtRef.current = id
    const api = apiRef.current
    if (!api) return
    inGate.current += 1
    try {
      see({ deal: id, gate: gateOf(api) })
    } finally {
      inGate.current -= 1
    }
  }, [ready, permalink, see, gateOf])

  // 要录像帧的观察器(从画面读死活),接上 renderer 的旁路。
  useEffect(() => {
    const renderer = rendererRef.current
    if (!ready || !renderer || !game.observe.frames) return
    renderer.watch((tape) => {
      if (!inGate.current) see({ frame: tape })
    })
    return () => renderer.watch(null)
  }, [ready, game, see])

  // ------------------------------------------------------------ 键盘

  const id = permalink ? decodeURIComponent(permalink.desc) : ''
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
  }, [acted])

  const submitText = useCallback(
    (kind: TextKind, text: string) => {
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
    },
    [acted],
  )

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
    if (ready && game.prefs.volatile) readPrefs()
  }, [ready, game, readPrefs])

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

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const api = apiRef.current
      if (!api) return
      acted()
      if (!e.shiftKey && !e.ctrlKey) wake(e.key)
      see({
        sent: {
          key: e.key,
          ...(e.location === 3 ? { pad: true as const } : {}),
          ...(e.shiftKey ? { shift: true as const } : {}),
          ...(e.ctrlKey ? { ctrl: true as const } : {}),
        },
        before: labelsRef.current,
      })
      if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
        e.preventDefault()
      if (game.prefs.volatile) readPrefs()
    },
    [acted, game, readPrefs, see, wake],
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
      key.press(board)
      canvasRef.current?.focus()
    },
    [acted, board],
  )

  // 渲染用的一份视野:state 驱动,和 viewNow() 的 ref 版内容一致。
  const view: View<unknown> = {
    labels,
    facts,
    cursor: mirrored ? awake : true,
    lit,
    armed,
    prefs,
    words,
  }

  const arrowPad = game.arrows ? padButtons(game.arrows, view, board) : null

  const padKey = (key: PadButton, at: React.CSSProperties) => (
    <button
      key={key.slot}
      type="button"
      data-slot={key.slot}
      data-on={key.face.on || undefined}
      data-off={key.gone || undefined}
      data-brush={key.face.ring ? 'true' : undefined}
      style={at}
      disabled={key.face.dead}
      aria-pressed={key.face.held}
      aria-label={key.face.says}
      {...(key.face.tip && key.face.says ? holdToAsk(key.face.says) : {})}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (key.face.tip && wasHeld()) return
        acted()
        key.press()
        canvasRef.current?.focus()
      }}
    >
      {'glyph' in key.face.art && <Icon name={key.face.art.glyph} />}
    </button>
  )

  const fixedKeys = (
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
      {/* 上游要等 wasm 起来才报得出预设,所以这个键先摆上、灰着,ready 之后才活:
          否则这一块会从三个键跳成四个,菜单键还跟着换一格。真的没有类型可选的
          游戏(npresets ≤ 1 且不能自定义,emcc.c 那时会撤掉整个下拉)才不画——
          那种游戏今天一个都没有,但 presets 的类型允许,不能当它不存在。 */}
      {(!ready || presets) && (
        <button
          type="button"
          aria-label={t.types.title}
          aria-haspopup="dialog"
          aria-expanded={typesOpen}
          disabled={!presets}
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
  )

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
            awakeRef.current = false
            setAwake(false)
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

      <PuzzleKeypad keys={keys} view={view} swatches={swatches} onPress={pressKey} />

      <nav className="play-actions">
        {arrows && arrowPad && arrowPad.buttons.length > 0 ? (
          <div
            className="play-keys"
            style={{ gridTemplateRows: `repeat(${arrowPad.rows}, var(--tap-w))` }}
          >
            <div
              className="pad-floor"
              aria-hidden="true"
              style={{ gridRow: `1 / span ${arrowPad.rows}` }}
            />
            {/* 固定键在左、方向键在右,所以 DOM 也这个顺序:tab 跟着屏幕从左到右走。
                display:contents 让方向键直接落进上面那张网格,同时留住那一层的 role
                和名字。一条渲染路径管所有键,摆哪儿由 util/pad 的格子号算好。
                方向键不给 tip:它要连着点,长按问一句会把连点打断。 */}
            {fixedKeys}
            <div className="play-arrows" role="group" aria-label={t.play.arrows.group}>
              {arrowPad.buttons.map((key) =>
                padKey(key, { gridRow: key.row, gridColumn: `c${key.col}` }),
              )}
            </div>
          </div>
        ) : (
          fixedKeys
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
                href={docHref(lang, `${game.pages.manual}.html`)}
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
          prefs={panelled}
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
