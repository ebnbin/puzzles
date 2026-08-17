// 改这里、或改 PuzzleHost 里的 noteSolved,要跑 scripts/check-solved.mjs
// (要 vite preview + playwright,build 里没有)。
import { done, fields } from '../games/util/save'

// 「玩家自己解出」的判据抄上游 flash 那一套(midend_finish_move 加各游戏的
// flash_length):解出且没求解过。midend_status() 只答前半句——它读的是当前状态,
// 用求解器解出来同样返回 +1,所以后半句要自己从存档里读。
//
// RESTART 会把 cheated 洗掉(midend_restart_game 从 state 0 重新复制),所以只看
// 最后一个 RESTART 之后有没有 SOLVE,不是整段历史。这一条和上游的 flash 一致。
// 读不懂就按「求解过」算,方向和 isPlayed 相反:那边怕丢玩家一局,这边怕把求解器
// 的成果记成玩家的。
export function usedSolver(save: string): boolean {
  const lines = fields(save)
  if (!lines) return true
  const kept = done(lines)
  if (!kept) return true
  const keys = kept.map((f) => f.key)
  return keys.slice(keys.lastIndexOf('RESTART') + 1).includes('SOLVE')
}
