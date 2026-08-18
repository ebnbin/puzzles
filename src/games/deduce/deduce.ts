// 推理键(group 'deduce'):全项目唯一一套上游不提供的能力。上游给的只有读存档、
// 写存档两块地基,推什么、推到哪一步全由这一侧自己定,没有任何东西可以对账——
// 所以它单独占一个命名空间,也单独占一个开关(puzzles.deduce)。
//
// 规矩一条:写下去的每一格都必须是当前棋面按规则可证明的,做不到就整个不做。
// 玩家没有理由怀疑一个替他填上的格子,所以猜错比不做坏得多。
import type { Key } from '../game'
import type { IconName } from '../../ui/Icon'
import { loadExtended } from '../util/save'

// 一次推理:拿到当前存档,交回一份写好走子的新存档;推不动、读不懂一律 null。
export type Think = (save: string) => string | null

// 这一类不带 button 码:上游没有对应的键(check-keys 正按 button 0 把我们自己加的
// 键排除在对账之外)。必须走存档门——推理写的那些走子 interpret_move 说不出来。
export function deduceKey<F>(glyph: IconName, think: Think): Key<F> {
  return {
    group: 'deduce',
    face: { art: { glyph } },
    press: (board) =>
      board.gate((g) => {
        const next = think(g.read())
        if (next) loadExtended(g, next)
      }),
  }
}
