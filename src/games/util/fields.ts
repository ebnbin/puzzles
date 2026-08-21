// 自定义参数控件的通用机器:取界、落格、夹值。看不见任何游戏——界长什么样
// 由各游戏文件的 Field 申报,这里只负责按申报把值收进合法处。
import type { DialogControl } from '../../engine/types'
import type { Field, Span } from '../game'

// 方格盘每边的默认上限。**约定:方格盘封 50**,要更小可以,要更大得有特殊理由。
// 这一档在桌面 1440×900 上每格 15 px 上下(net 15.7、cube 方格 15.3、fifteen 15.0、
// sixteen 15.0),是这个前端的清晰度地板——它没有平移缩放,画小了就等于玩不了。
// 改这个数是改约定,不是改一个游戏。
export const SQUARE_MAX = 50

// 小数步长(barrier 的 0.05)累加会漂,每一步都收一次尾。
const tidy = (n: number, step: number) =>
  Number(n.toFixed(step < 1 ? 6 : 0))

const barred = (span: Span, n: number) => !!span.skip?.includes(n)

// 落到 step 的网格上、夹进两端、再避开挖掉的孤立值(往上找不到才往回)。
export function snap(span: Span, want: number): number {
  const step = span.step ?? 1
  const held = Math.min(span.max, Math.max(span.min, want))
  const grid = tidy(span.min + Math.round((held - span.min) / step) * step, step)
  const at = Math.min(span.max, Math.max(span.min, grid))
  if (!barred(span, at)) return at
  for (let d = step; d <= span.max - span.min; d = tidy(d + step, step)) {
    const up = tidy(at + d, step)
    if (up <= span.max && !barred(span, up)) return up
    const down = tidy(at - d, step)
    if (down >= span.min && !barred(span, down)) return down
  }
  return at
}

export function numberAt(controls: readonly DialogControl[], at: number): number {
  const control = controls[at]
  return control?.kind === 'string' ? Number(control.value) : NaN
}

export function flagAt(controls: readonly DialogControl[], at: number): boolean {
  const control = controls[at]
  return control?.kind === 'boolean' ? control.value : false
}

export function pickAt(controls: readonly DialogControl[], at: number): number {
  const control = controls[at]
  return control?.kind === 'choices' ? control.value : -1
}

// 这一格现在归不归 slider 管。label 对不上就是上游动过对话框:那一条整个作废,
// 退回文本框——「消失」比「按下去不对」好找。
export function fieldAt(
  fields: readonly Field[] | undefined,
  at: number,
  controls: readonly DialogControl[],
): Field | null {
  const field = fields?.find((f) => f.at === at)
  if (!field) return null
  const control = controls[at]
  return control?.kind === 'string' && control.label === field.label ? field : null
}

// 写回 C 的活对象:C 侧按字符串收,读的时候 atoi/atof。尾零去掉,和上游
// encode_params 的 %g 一个写法。
export function write(control: DialogControl, n: number, decimals = 0): void {
  if (control.kind !== 'string') return
  control.value = String(decimals > 0 ? Number(n.toFixed(decimals)) : Math.round(n))
}

// 把每个申报过的格子收进合法处。界互相牵制,夹一个可能让别人的界跟着变,
// 所以反复走到不动为止;轮数封顶,防两条界互相推来推去转不完。
export function settle(
  fields: readonly Field[] | undefined,
  controls: DialogControl[],
): boolean {
  if (!fields?.length) return false
  let touched = false
  for (let round = 0; round < 4; round++) {
    let moved = false
    for (const field of fields) {
      const control = controls[field.at]
      if (!control || control.kind !== 'string' || control.label !== field.label) continue
      const now = Number(control.value)
      if (!Number.isFinite(now)) continue
      const want = snap(field.span(controls), now)
      if (want === now) continue
      write(control, want, field.decimals)
      moved = true
      touched = true
    }
    if (!moved) break
  }
  return touched
}
