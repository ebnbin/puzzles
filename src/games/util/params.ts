// 自定义参数的范围模型。C 侧只把 label 和字符串值交过来(emcc.c:625),范围知识
// 全在这一侧:每个 string 控件按 label 申报一张「允许值表」,表由其它控件的当前值
// 算出。申报顺序即依赖顺序:一张表只许看排在它前面的数字参数,以及任意 choices /
// boolean 控件;排在后面的一律当作可以随之调整。settle 按同一顺序单趟走完,值不在
// 表内就吸到最近的一个(等距取大),走完必是上游 validate_params(full=true) 放行的
// 组合——这条不变量由 scripts/check-params.mjs 对着链接了上游源码的 oracle 逐值验证。
import type { DialogControl } from '../../engine/types'

// 上游没给上限时的封顶:网格维度 100 = 棋盘最多 100×100 格。计数类参数先同用这
// 一个数,哪些参数被它封顶列在 docs/params.md,待下一阶段逐个调。
export const CAP = 100

export type Read = {
  int(label: string): number
  flag(label: string): boolean
  pick(label: string): number
}

export type Param =
  | {
      kind: 'int'
      label: string
      allowed(r: Read): readonly number[]
      // 值旁边附的说明(比如雷数换算成占比),只是给人看。
      note?(v: number, r: Read): string
    }
  | {
      kind: 'float'
      label: string
      digits: number
      allowed(r: Read): readonly number[]
      // 读数换成别的量(Rectangles 的粒度 t):只管显示,写进控件的仍是 digits 位的原值。
      show?(v: number, r: Read): string
      note?(v: number, r: Read): string
    }
  // 「a-b」区间型字符串:两个数各一张表,hi 的表看得见 lo 的当前值。
  | {
      kind: 'span'
      label: string
      lo(r: Read): readonly number[]
      hi(r: Read, lo: number): readonly number[]
    }

export const int = (
  label: string,
  allowed: (r: Read) => readonly number[],
  note?: (v: number, r: Read) => string,
): Param => ({ kind: 'int', label, allowed, note })

export const float = (
  label: string,
  digits: number,
  allowed: (r: Read) => readonly number[],
  extra?: { show?(v: number, r: Read): string; note?(v: number, r: Read): string },
): Param => ({ kind: 'float', label, digits, allowed, ...extra })

export const span = (
  label: string,
  lo: (r: Read) => readonly number[],
  hi: (r: Read, lo: number) => readonly number[],
): Param => ({ kind: 'span', label, lo, hi })

// ---------------------------------------------------------------- 表的词汇

// 闭区间的整数;边界算不出(NaN)或空区间给空表,settle 遇空表跳过。
export function range(lo: number, hi: number): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
  const out: number[] = []
  for (let v = Math.ceil(lo); v <= hi; v++) out.push(v)
  return out
}

export const evens = (lo: number, hi: number): number[] =>
  range(lo, hi).filter((v) => v % 2 === 0)

// 浮点等距取样,按 digits 位小数取整,免得 0.1+0.2 那种尾巴进表。
export function steps(lo: number, hi: number, step: number, digits: number): number[] {
  const out: number[] = []
  const scale = 10 ** digits
  for (let i = 0; ; i++) {
    const v = Math.round((lo + i * step) * scale) / scale
    if (v > hi + step / 2) break
    out.push(v)
  }
  return out
}

export function divisors(n: number): number[] {
  if (!Number.isFinite(n) || n < 1) return []
  const out: number[] = []
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d)
  return out
}

export const without = (list: readonly number[], ...drop: number[]): number[] =>
  list.filter((v) => !drop.includes(v))

// ---------------------------------------------------------------- 读与落定

const control = (controls: readonly DialogControl[], label: string) =>
  controls.find((c) => c.label === label)

export function reader(controls: readonly DialogControl[]): Read {
  const text = (label: string) => {
    const c = control(controls, label)
    return c?.kind === 'string' ? c.value : ''
  }
  return {
    int: (label) => parseInt(text(label), 10),
    flag: (label) => {
      const c = control(controls, label)
      return c?.kind === 'boolean' ? c.value : false
    },
    pick: (label) => {
      const c = control(controls, label)
      return c?.kind === 'choices' ? c.value : NaN
    },
  }
}

// 最近的表内值(在表内就是它自己);等距取大——被别的参数挤出去时往「更大的棋盘」
// 那边让,不往退化的一边。
export function snap(list: readonly number[], v: number): number {
  let best = list[0]
  for (const x of list) {
    const d = Math.abs(x - v)
    const b = Math.abs(best - v)
    if (d < b || (d === b && x > best)) best = x
  }
  return best
}

export const formatFloat = (v: number, digits: number): string =>
  String(Number(v.toFixed(digits)))

export function parseSpan(text: string): [number, number] {
  const m = /^\s*(-?\d+)\s*-\s*(-?\d+)/.exec(text)
  if (m) return [Number(m[1]), Number(m[2])]
  const one = parseInt(text, 10)
  return [one, one]
}

export const formatSpan = (lo: number, hi: number): string =>
  lo === hi ? String(lo) : `${lo}-${hi}`

// 表里的浮点是按位数取整过的,C 用 %g 回显再 parseFloat 得到同一个 double,精确比较就够。
const has = (list: readonly number[], v: number): boolean => list.includes(v)

// 就地把每个申报了的 string 控件夹进它此刻的表。返回改了哪些 label。
export function settle(params: readonly Param[], controls: DialogControl[]): string[] {
  const changed: string[] = []
  const r = reader(controls)
  for (const p of params) {
    const c = control(controls, p.label)
    if (c?.kind !== 'string') continue
    let next: string | null = null
    if (p.kind === 'int') {
      const list = p.allowed(r)
      const v = parseInt(c.value, 10)
      if (list.length > 0 && !has(list, v)) next = String(snap(list, v))
    } else if (p.kind === 'float') {
      const list = p.allowed(r)
      const v = parseFloat(c.value)
      if (list.length > 0 && !has(list, v)) next = formatFloat(snap(list, v), p.digits)
    } else {
      const [lo, hi] = parseSpan(c.value)
      const los = p.lo(r)
      if (los.length === 0) continue
      const lo2 = snap(los, lo)
      const his = p.hi(r, lo2)
      if (his.length === 0) continue
      const text = formatSpan(lo2, snap(his, hi))
      if (text !== c.value) next = text
    }
    if (next !== null) {
      c.value = next
      changed.push(p.label)
    }
  }
  return changed
}
