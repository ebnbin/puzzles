// 改这里、或改 pages/puzzle/useOutcome.ts 的完成判定,要跑 scripts/check-solved.mjs
// (要 vite preview + playwright,build 里没有)。
import { done, fields } from '../games/util/save'

// 「玩家自己解出」= 解出且没求解过,同上游 flash 的判据(midend_finish_move 加各游戏的 flash_length)。
// midend_status() 用求解器解出来同样返回 +1,「没求解过」要自己从存档里读;RESTART 会洗掉 cheated
// (midend_restart_game 从 state 0 重新复制),所以只看最后一个 RESTART 之后有没有 SOLVE。
// 读不懂的存档按「求解过」算。
export function usedSolver(save: string): boolean {
  const lines = fields(save)
  if (!lines) return true
  const kept = done(lines)
  if (!kept) return true
  const keys = kept.map((f) => f.key)
  return keys.slice(keys.lastIndexOf('RESTART') + 1).includes('SOLVE')
}
