// 棋盘通道:五项每游戏状态(标签、事实、光标镜像、粘滞键、上膛)和喂它们的
// 全部管道。存档门的重入计数私有在这里,引擎回调只能走 heard/moved/sleep/
// dealt/frame 进来——门内的载入/按键是探测和改写的机械动作,不是棋局事件,
// 一律不喂观察器;门关上之后如果真载入过存档,补一个 {moved}。
import { useCallback, useMemo, useRef, useState } from 'react'
import type { CanvasRenderer, Drawn } from '../engine/renderer'
import type { DialogControl, PuzzleApi } from '../engine/types'
import type {
  Armed,
  Board,
  Game,
  Gate,
  Labels,
  Saw,
  Stroke,
  View,
  Words,
} from '../games/game'
import { keyOf } from '../games/game'
import { useStrings } from '../i18n'

const NO_LIT: ReadonlySet<string> = new Set()

const strokeArgs = (s: Stroke): [number, string, string, number, number, number] =>
  typeof s === 'string'
    ? [0, s, '', 0, 0, 0]
    : [0, s.key, '', s.pad ? 3 : 0, s.shift ? 1 : 0, s.ctrl ? 1 : 0]

export function useBoard(
  game: Game<unknown>,
  apiRef: React.RefObject<PuzzleApi | null>,
  rendererRef: React.RefObject<CanvasRenderer | null>,
  acted: () => void,
) {
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
  const [prefs, setPrefs] = useState<readonly DialogControl[]>([])
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const mirrored = game.upstream.cursor.kind === 'mirrored'
  const wakeKeys = mirrored
    ? (game.upstream.cursor as { wakes: readonly string[] }).wakes
    : null

  const t = useStrings()
  const words: Words = useMemo(() => ({ ...t.play, keys: t.keys }), [t])
  const wordsRef = useRef(words)
  wordsRef.current = words

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

  const gateOf = useCallback(
    (api: PuzzleApi): Gate => {
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
    },
    [rendererRef],
  )

  // 交给游戏代码(键的 press、观察器)的那只手柄。
  const handle = useMemo(
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
    [acted, apiRef, game, gateOf, see, viewNow, wake],
  )

  // ---------------------------------------------------- 引擎回调进来的几扇门

  // 已发布的胶水在两词相同时把 space 抹成空串,按 upstream.echoes 在这里复原:
  // 接口内部只见双词。
  const heard = useCallback(
    (blanked: string, enter: string) => {
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
    [game, see],
  )

  const moved = useCallback(() => {
    const api = apiRef.current
    if (!inGate.current && game.observe.saves && api) see({ moved: api.saveGame() })
  }, [apiRef, game, see])

  // 物理键盘的一次按键:唤醒镜像光标(带修饰键的不算)+ 喂观察器。
  // api.key 由调用方自己发,preventDefault 的决定在那边。
  const typed = useCallback(
    (s: Stroke) => {
      if (typeof s === 'string' || (!s.shift && !s.ctrl)) wake(keyOf(s))
      see({ sent: s, before: labelsRef.current })
    },
    [see, wake],
  )

  const sleep = useCallback(() => {
    awakeRef.current = false
    setAwake(false)
  }, [])

  const gated = useCallback(() => inGate.current > 0, [])

  // 发牌事件。观察器可能借 gate 探测(map 的线索表要重放发牌),那是对引擎的
  // 重入,只能从 effect 进来,不能发生在引擎回调栈上——effect 归 useEngine,
  // 门的包装归这里。
  const dealt = useCallback(
    (id: string, api: PuzzleApi) => {
      inGate.current += 1
      try {
        see({ deal: id, gate: gateOf(api) })
      } finally {
        inGate.current -= 1
      }
    },
    [gateOf, see],
  )

  const frame = useCallback(
    (tape: readonly Drawn[]) => {
      if (!inGate.current) see({ frame: tape })
    },
    [see],
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

  return {
    view,
    viewNow,
    handle,
    setPrefs,
    heard,
    moved,
    typed,
    sleep,
    gated,
    dealt,
    frame,
  }
}
