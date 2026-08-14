// palisade 一个标签都不报,两个键的死活全从每一帧画面里读:光标框的形状说明
// 脚下能不能画墙,框底边的颜色说明那里是墙、「没有墙」的记号还是空(palisade.c:1228)。
// 都是在猜别人的绘图代码,错了是静悄悄的:改这里跑 scripts/check-palisade.mjs。
import type { Drawn } from './renderer'

const WALL = 2
const MAYBE = 3
const NO = 4
// 颜色编号照 palisade.c:1162-1173 的 enum 顺序;ERROR(5)是「破坏了线索的墙」,
// 语义仍是墙——必须留在过滤名单里并归入 'wall',漏掉它,凡标红的墙上按键全部失灵。
const ERROR = 5

export type Border = 'wall' | 'no' | 'none'

export type Stand = { live: boolean; has: Border | null }

const OUT: Stand = { live: false, has: null }

// null 和 OUT 是两个答案:空 tape = 这一帧根本不是重画(无效按压什么都不画),
// 返回 null 让调用方保留上一次读数;有重画而没有光标框才是 OUT。合并两者,
// 每次无效按压都会把 stand 清掉,光标明明在边上两个键却灰掉。
export function readStand(tape: readonly Drawn[]): Stand | null {
  if (tape.length === 0) return null

  const box = tape.filter((d) => d.kind === 'poly' && d.points.length === 8).at(-1)
  if (!box || box.kind !== 'poly') return OUT

  const xs = box.points.filter((_, i) => i % 2 === 0)
  const ys = box.points.filter((_, i) => i % 2 === 1)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  if (x1 - x0 === y1 - y0) return OUT

  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const under = tape
    .filter(
      (d) =>
        d.kind === 'rect' &&
        (d.colour === WALL || d.colour === MAYBE || d.colour === NO || d.colour === ERROR) &&
        cx >= d.x &&
        cx <= d.x + d.w &&
        cy >= d.y &&
        cy <= d.y + d.h,
    )
    .at(-1)
  if (!under || under.kind !== 'rect') return { live: true, has: null }
  return {
    live: true,
    has: under.colour === NO ? 'no' : under.colour === MAYBE ? 'none' : 'wall',
  }
}
