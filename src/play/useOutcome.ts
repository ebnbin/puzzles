// 完成判定:一局走到头(解出或输掉)抬起收尾浮层,玩家自己解出时再记一笔。
// 触发点是 checkStatus 的调用方(onUndoRedo)——emcc.c 的 post_move() 在每次
// 输入后都发它,是 JS 侧唯一「状态可能变了」的信号。
//
// 两件事共用一次 status(),但闸门不同:浮层认「结束」,所以求解器解出的也抬;
// 记录认「玩家自己解出」,求解器解出的不算。
//
// 一律只认沿,不认状态:一局的第一次观察永远不算,否则读档读到一局已经结束的、
// 以及启动时「随机局(0) → 读档后的结束局(±1)」这一跳都会误触发。回到进行中
// (undo 回去)就重新武装,浮层也跟着收起来——关掉之后不再自己冒出来,靠的就是
// 「已经过了那道沿」。
import { useCallback, useRef, useState } from 'react'
import { alreadySolved, markSolved } from '../engine/saves'
import { usedSolver } from '../engine/solved'
import type { PuzzleApi } from '../engine/types'

export function useOutcome(name: string, apiRef: React.RefObject<PuzzleApi | null>) {
  // 当前这一局的 desc,给完成判定当身份用。要 ref 不要 state:判定跑在
  // onUndoRedo 里,那时 setPermalink 排的那一轮渲染还没落地。
  const here = useRef<string | null>(null)
  const wasStatus = useRef<{ desc: string; status: number } | null>(null)
  // 会话内的闩锁不是 alreadySolved 的冗余:localStorage 被禁(隐私模式/配额)时那边
  // 读回永远是「没报过」,undo 再 redo 就会一路重报。
  const reported = useRef<string | null>(null)
  const [over, setOver] = useState(false)

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
  }, [name, apiRef])

  const arrived = useCallback((desc: string) => {
    here.current = desc
  }, [])

  const dismiss = useCallback(() => setOver(false), [])

  return { over, dismiss, checkStatus, arrived }
}
