// 引擎生命周期:起 wasm、绑回调、存档持久化,并把引擎事件泵进旁边的三个域
// (棋盘通道、config box、完成判定)。回调栈上不做重入的事,见 dealt 的 effect。
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPuzzle } from '../../engine/createPuzzle'
import type { CanvasRenderer, Drawn } from '../../engine/renderer'
import {
  clearSave,
  isPlayed,
  readSave,
  setPlaying,
  writeRecent,
  writeSave,
} from '../../engine/saves'
import type { DialogSpec, Preset, PuzzleApi } from '../../engine/types'
import type { Game } from '../../games/game'
import type { Resolved } from '../../useTheme'

export const START_FAILED = '\0start'

type EngineArgs = {
  name: string
  game: Game<unknown>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  areaRef: React.RefObject<HTMLDivElement | null>
  apiRef: React.RefObject<PuzzleApi | null>
  rendererRef: React.RefObject<CanvasRenderer | null>
  armedSave: React.RefObject<boolean>
  setError: (message: string | null) => void
  theme: Resolved
  board: {
    heard(blanked: string, enter: string): void
    moved(): void
    sleep(): void
    gated(): boolean
    dealt(id: string, api: PuzzleApi): void
    frame(tape: readonly Drawn[]): void
  }
  outcome: {
    checkStatus(): void
    arrived(desc: string): void
  }
  config: {
    tookDialog(spec: DialogSpec | null): void
    tookError(message: string): boolean
  }
}

export function useEngine({
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
}: EngineArgs) {
  const { heard, moved, sleep, gated, dealt, frame } = board
  const { checkStatus, arrived } = outcome
  const { tookDialog, tookError } = config

  const [status, setStatus] = useState<string | null>(null)
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [selected, setSelected] = useState(0)
  const [standard, setStandard] = useState<number | null>(null)
  const [canSolve, setCanSolve] = useState(true)
  const [undoRedo, setUndoRedo] = useState({ undo: false, redo: false })
  const [permalink, setPermalink] = useState<{ desc: string; seed: string | null }>()
  const [ready, setReady] = useState(false)

  const startedRef = useRef(false)
  const effectAlive = useRef(false)
  const liveRef = useRef(true)
  const restoring = useRef(false)
  const savePending = useRef(false)
  const themeRef = useRef(theme)
  themeRef.current = theme

  const queueSave = useCallback(() => {
    if (!armedSave.current || savePending.current) return
    savePending.current = true
    queueMicrotask(() => {
      savePending.current = false
      const api = apiRef.current
      if (api) writeSave(name, api.saveGame())
    })
  }, [armedSave, apiRef, name])

  useEffect(() => {
    writeRecent(name)
    setPlaying(true)
  }, [name])

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
      defaults: game.prefs.defaults,
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
          moved()
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
          if (!tookError(message)) setError(message)
        },
        onStatus: setStatus,
        onUndoRedo: (undo, redo) => {
          setUndoRedo({ undo, redo })
          queueSave()
          moved()
          checkStatus()
        },
        // emcc.c 先报 CURSOR_SELECT2 再报 CURSOR_SELECT,这里的形参序(space, enter)
        // 是故意的;两词同词的抹空由 board.heard 按 echoes 复原。
        onKeyLabels: heard,
        onPermalinks: (desc, seed) => {
          arrived(desc)
          setPermalink({ desc, seed })
          queueSave()
          if (!gated()) sleep()
        },
        // 第一次报的一定是默认预设:emcc.c 建菜单时先调 select_appropriate_preset(),
        // 读存档和玩家选择都在其后,所以「第一个赢」拿到的就是 default_params()。
        // 四十个游戏里二十个的默认不是列表第一项,这个值不能猜。
        onPresetSelected: (index) => {
          setStandard((first) => first ?? index)
          setSelected(index)
        },
        onSolveRemoved: () => setCanSolve(false),
        onDialog: tookDialog,
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
    // game 由 name 唯一决定,Puzzle 页用 key 保证换游戏必然重挂载;接缝上的
    // 函数(heard/moved/…)都是每次挂载不变的 useCallback,启动时抓一份就够。
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
    dealt(id, api)
  }, [ready, permalink, apiRef, dealt])

  // 要录像帧的观察器(从画面读死活),接上 renderer 的旁路。
  useEffect(() => {
    const renderer = rendererRef.current
    if (!ready || !renderer || !game.observe.frames) return
    renderer.watch(frame)
    return () => renderer.watch(null)
  }, [ready, game, frame, rendererRef])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !ready) return
    if (!renderer.setDark(theme === 'dark')) return
    // rescale 而不是 resize:resize_puzzle 只在算出的尺寸变了才重画,这里尺寸没变。
    apiRef.current?.rescale()
  }, [theme, ready, apiRef, rendererRef])

  return {
    ready,
    status,
    presets,
    selected,
    setSelected,
    standard,
    canSolve,
    undoRedo,
    permalink,
  }
}
