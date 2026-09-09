// 发牌门面。三条会走到 midend_new_game 的路(New Game、选预设、自定义参数)全部
// 无条件走镜像——一局要生成多久事先算不出来,所以不分流。主线程那局在镜像算完之前
// 一动不动:失败和取消都只是「什么都不做」,屏幕上仍是上一局,连 undo 栈都在。
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DealAction } from '../../engine/deal'
import { composePrefs } from '../../engine/createPuzzle'
import { Dealer, type DealOutcome } from '../../engine/dealer'
import type { PuzzleApi } from '../../engine/types'
import type { Game } from '../../games/game'
import { SHORTCUTS_OFF } from './useShortcuts'

// 加载态立刻透明地拦住输入,过了这个点才把对话框摆出来:多数发牌只要几毫秒,
// 每次都闪一个模态比偶尔卡一下更烦人。
const SHOW_AFTER_MS = 400
// 摆出来了就至少留这么久,免得在阈值边缘一闪而过。
const KEEP_MS = 300

// unavailable = 没有镜像(浏览器起不了模块 worker),调用方退回主线程自己发。
// busy = 上一次还没回来;拦截层挡着,正常玩不出来,只有程序内的重入会撞上。
export type DealResult = DealOutcome | { status: 'unavailable' } | { status: 'busy' }

const wait = (ms: number) => new Promise((done) => window.setTimeout(done, ms))

export function useDeal(
  name: string,
  game: Game<unknown>,
  apiRef: React.RefObject<PuzzleApi | null>,
) {
  const [dealing, setDealing] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const dealerRef = useRef<Dealer | null>(null)
  const busy = useRef(false)

  // 偏好在局内可以改(菜单里那一段),所以每次重开镜像都现读一遍,不抓快照。
  // 两边必须是同一份:偏好住在 game_ui 里,而 decode_ui 跑在 apply_prefs 之后。
  const prefsRef = useRef<() => string | null>(() => null)
  prefsRef.current = () => composePrefs(name, game.prefs.defaults, SHORTCUTS_OFF)

  useEffect(() => {
    const dealer = new Dealer(name, () => prefsRef.current())
    dealerRef.current = dealer
    return () => {
      dealer.dispose()
      dealerRef.current = null
    }
  }, [name])

  const deal = useCallback(
    async (action: DealAction): Promise<DealResult> => {
      const api = apiRef.current
      const dealer = dealerRef.current
      if (!api) return { status: 'busy' }
      if (!dealer?.live) return { status: 'unavailable' }
      if (busy.current) return { status: 'busy' }

      busy.current = true
      setDealing(true)
      let shownAt = 0
      const timer = window.setTimeout(() => {
        shownAt = Date.now()
        setWaiting(true)
      }, SHOW_AFTER_MS)
      try {
        // 快照同时是镜像的输入和回滚的参照:主线程不改,回滚就不用做事。
        return await dealer.deal(api.saveGame(), action)
      } finally {
        window.clearTimeout(timer)
        if (shownAt) await wait(Math.max(0, KEEP_MS - (Date.now() - shownAt)))
        setWaiting(false)
        setDealing(false)
        busy.current = false
      }
    },
    [apiRef],
  )

  // 镜像正卡在同步的 C 循环里,收不到消息,只能整个终止再重开。
  const cancel = useCallback(() => dealerRef.current?.cancel(), [])

  return { deal, cancel, dealing, waiting }
}
