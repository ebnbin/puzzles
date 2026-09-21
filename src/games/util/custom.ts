// 自定义参数的申报与联动机器。看不见游戏:字段按 C 给的 label 认,规则是各游戏
// validate_params(full) 的逐条移植,这里只负责把「改一个值」变成「一组合法的值」。
//
// 层级:mode(开关、具名枚举)> dim(尺寸)> count(由尺寸派生的计数、小数、数值枚举)。
// 改动一个字段时,它自己不动,mode 永远不动,其余按层级修复:先动计数再动尺寸,每次
// 只把一个字段挪到满足自身规则的最近值。尺寸之间对等:动了宽,高让位。搜索尺寸的
// 新值时不看涉及计数的规则——计数随后自己会让。修不好即这一步不允许,slider 吸附到
// 最近能修好的值。
//
// 两条自家规则住在这里,不进各游戏的规则表:宽高不超过 100,宽高比不超过 4:1;只对
// role 为 width / height 的字段生效。
import type { DialogControl } from '../../engine/types'
import type { Strings } from '../../i18n'

export type Word = keyof Strings['config']

// 规则读的值:布尔是 0 / 1,枚举是下标,小数是真实值。
export type Values = Readonly<Record<string, number>>

export type Role = 'width' | 'height' | 'dim' | 'count'

export type Field =
  // zero:0 有特殊含义时(打乱步数 0 = 随机)显示成这个词而不是数字。suffix 跟在数字后面
  // 显示(百分比的 %),不进 C 的值。
  | {
      kind: 'int'
      key: string
      label: string
      word: Word
      min: number
      max: number
      role: Role
      zero?: Word
      suffix?: string
    }
  | {
      kind: 'float'
      key: string
      label: string
      word: Word
      min: number
      max: number
      step: number
      digits: number
    }
  // C_CHOICES 两种画法:pick 是具名枚举,分段按钮,选项逐个给词;scale 的选项本质是
  // 数("1"、"20%"),slider,当前值直接显示上游的选项原文。
  | { kind: 'pick'; key: string; label: string; word: Word; options: readonly Word[] }
  | { kind: 'scale'; key: string; label: string; word: Word }
  | { kind: 'flag'; key: string; label: string; word: Word }
  // 一个文本控件装着 "a-b" 区间(blackbox 的球数),画成两个 slider;相等时写成 "a"。
  | {
      kind: 'span'
      keys: readonly [string, string]
      label: string
      words: readonly [Word, Word]
      min: number
      max: number
    }

// bad 为真即上游会回绝这组值;on 列出它读的字段,每条只应靠改其中一个字段就能满足
// (上游 w < 2 || h < 2 这种要拆成两条)。at 是来源行号,给读代码的人对账用。
export type Rule = { at: string; on: readonly string[]; bad: (v: Values) => boolean }

export type Custom = { fields: readonly Field[]; rules: readonly Rule[] }

export const rule = (at: string, on: readonly string[], bad: (v: Values) => boolean): Rule => ({
  at,
  on,
  bad,
})

export const BOARD_MAX = 100
export const AREA_MAX = BOARD_MAX * BOARD_MAX
export const ASPECT_MAX = 4

const keysOf = (field: Field): readonly string[] =>
  field.kind === 'span' ? field.keys : [field.key]

type Tier = 0 | 1 | 2
const tierOf = (field: Field): Tier =>
  field.kind === 'pick' || field.kind === 'flag'
    ? 0
    : field.kind === 'int' && field.role !== 'count'
      ? 1
      : 2

// ---------------------------------------------------------------- 数值字段的刻度

// slider 与搜索都走整数刻度 unit;小数字段 unit = 第几步。
type Scale = { lo: number; hi: number; value(unit: number): number; unit(value: number): number }

// scale 字段的上限是上游选项数,绑定时才知道,先记 hi = -1,bind 后补。
function scaleOf(field: Field): Scale | null {
  switch (field.kind) {
    case 'int': {
      const hi = field.role === 'width' || field.role === 'height'
        ? Math.min(field.max, BOARD_MAX)
        : field.max
      return { lo: field.min, hi, value: (u) => u, unit: (v) => Math.round(v) }
    }
    case 'span':
      return { lo: field.min, hi: field.max, value: (u) => u, unit: (v) => Math.round(v) }
    case 'float': {
      const steps = Math.round((field.max - field.min) / field.step)
      const at = (u: number) => Number((field.min + u * field.step).toFixed(field.digits))
      return {
        lo: 0,
        hi: steps,
        value: at,
        unit: (v) => Math.min(steps, Math.max(0, Math.round((v - field.min) / field.step))),
      }
    }
    case 'scale':
      return { lo: 0, hi: -1, value: (u) => u, unit: (v) => Math.round(v) }
    default:
      return null
  }
}

// ---------------------------------------------------------------- 模型

type Model = {
  custom: Custom
  fieldOf: ReadonlyMap<string, Field>
  tier: ReadonlyMap<string, Tier>
  scale: ReadonlyMap<string, Scale>
  rules: readonly Rule[]
}

const models = new WeakMap<Custom, Model>()

function modelOf(custom: Custom): Model {
  const known = models.get(custom)
  if (known) return known
  const fieldOf = new Map<string, Field>()
  const tier = new Map<string, Tier>()
  const scale = new Map<string, Scale>()
  let width: string | null = null
  let height: string | null = null
  for (const field of custom.fields) {
    for (const key of keysOf(field)) {
      fieldOf.set(key, field)
      tier.set(key, tierOf(field))
      const s = scaleOf(field)
      if (s) scale.set(key, s)
    }
    if (field.kind === 'int' && field.role === 'width') width = field.key
    if (field.kind === 'int' && field.role === 'height') height = field.key
  }
  const rules = [...custom.rules]
  if (width !== null && height !== null) {
    const w = width
    const h = height
    rules.push(
      rule('house', [w, h], (v) => v[w] > ASPECT_MAX * v[h] || v[h] > ASPECT_MAX * v[w]),
    )
  }
  const model: Model = { custom, fieldOf, tier, scale, rules }
  models.set(custom, model)
  return model
}

// 搜 key 的新值时该看的规则:涉及的字段层级都不高于它自己(更低层的计数随后自己让)。
const relevant = (model: Model, key: string): readonly Rule[] => {
  const mine = model.tier.get(key) ?? 2
  return model.rules.filter(
    (r) => r.on.includes(key) && r.on.every((k) => (model.tier.get(k) ?? 2) <= mine),
  )
}

const satisfied = (rules: readonly Rule[], values: Values) => rules.every((r) => !r.bad(values))

// 离当前值最近、能满足自身规则的刻度;等距时先看更大的那边。给了 only 就只求满足这一条。
function nearest(model: Model, values: Values, key: string, only: Rule | null = null): number | null {
  const s = model.scale.get(key)
  if (!s) return null
  const rules = only ? [only] : relevant(model, key)
  const from = s.unit(values[key])
  const reach = Math.max(from - s.lo, s.hi - from)
  for (let d = 0; d <= reach; d++) {
    for (const u of d === 0 ? [from] : [from + d, from - d]) {
      if (u < s.lo || u > s.hi) continue
      const v = s.value(u)
      if (satisfied(rules, { ...values, [key]: v })) return v
    }
  }
  return null
}

const REPAIR_STEPS = 32

// 以 changed 为准修出一组合法的值;修不好答 null。只许动同层或更低层的字段:计数顶
// 不动尺寸,尺寸顶不动模式——顶不动就是这一步不允许。
function repair(model: Model, start: Values, changed: string): Values | null {
  let values = start
  const floor = model.tier.get(changed) ?? 2
  const movable = (k: string) => k !== changed && (model.tier.get(k) ?? 2) >= Math.max(1, floor)
  // 坏掉的规则里只要有一条没有能动的字段,怎么修都修不好,直接答 null;不然先去修别的
  // 规则会白搜一遍(blackbox 球数下限扫到格数以上时,每个刻度都要把上限扫一万格)。
  if (model.rules.some((r) => r.bad(start) && !r.on.some(movable))) return null
  for (let i = 0; i < REPAIR_STEPS; i++) {
    const broken = model.rules.find((r) => r.bad(values))
    if (!broken) return values
    const targets = broken.on
      .filter(movable)
      .sort((a, b) => (model.tier.get(b) ?? 2) - (model.tier.get(a) ?? 2))
    // 先找一步就把自身规则全满足的字段;都没有再退一步:只把这条坏规则修好,连带弄坏的
    // 留给下一轮换个字段修——「必须正方形」加上尺寸下限这种要两个字段一起动的,靠这一手。
    let moved = false
    for (const strict of [true, false]) {
      for (const key of targets) {
        const v = nearest(model, values, key, strict ? null : broken)
        if (v === null || v === values[key]) continue
        values = { ...values, [key]: v }
        moved = true
        break
      }
      if (moved) break
    }
    if (!moved) return null
  }
  return null
}

// ---------------------------------------------------------------- 对外

// 把 key 改成 unit 刻度上的值(或开关、枚举的取值),连带修好其余字段。
export function change(custom: Custom, values: Values, key: string, next: number): Values | null {
  const model = modelOf(custom)
  return repair(model, { ...values, [key]: next }, key)
}

export const unitOf = (custom: Custom, key: string, value: number): number =>
  modelOf(custom).scale.get(key)?.unit(value) ?? value

export const valueOf = (custom: Custom, key: string, unit: number): number =>
  modelOf(custom).scale.get(key)?.value(unit) ?? unit

const allowed = (model: Model, values: Values, key: string, unit: number): boolean => {
  const s = model.scale.get(key)
  if (!s || unit < s.lo || unit > s.hi) return false
  return repair(model, { ...values, [key]: s.value(unit) }, key) !== null
}

// slider 两端:在其余字段能让位的前提下,这个字段够得着的最小和最大刻度。
export function extent(custom: Custom, values: Values, key: string): { lo: number; hi: number } {
  const model = modelOf(custom)
  const s = model.scale.get(key)
  if (!s) return { lo: 0, hi: 0 }
  let lo = s.lo
  while (lo < s.hi && !allowed(model, values, key, lo)) lo++
  let hi = s.hi
  while (hi > lo && !allowed(model, values, key, hi)) hi--
  return { lo, hi }
}

// 松手落在不允许的刻度上时吸附到最近能修好的刻度;等距时取更小的那边。
export function snap(custom: Custom, values: Values, key: string, unit: number): number | null {
  const model = modelOf(custom)
  const s = model.scale.get(key)
  if (!s) return null
  const reach = Math.max(unit - s.lo, s.hi - unit)
  for (let d = 0; d <= reach; d++) {
    for (const u of d === 0 ? [unit] : [unit - d, unit + d]) {
      if (allowed(model, values, key, u)) return u
    }
  }
  return null
}

// 加减键:沿 dir 方向下一个允许的刻度。
export function neighbour(
  custom: Custom,
  values: Values,
  key: string,
  dir: 1 | -1,
): number | null {
  const model = modelOf(custom)
  const s = model.scale.get(key)
  if (!s) return null
  for (let u = s.unit(values[key]) + dir; u >= s.lo && u <= s.hi; u += dir) {
    if (allowed(model, values, key, u)) return u
  }
  return null
}

// ---------------------------------------------------------------- 常用字段

// 多数游戏的棋盘宽高就叫 "Width" / "Height";键是上游 game_params 里的变量名,多数叫
// w / h,叫别的(width、w2)由游戏传进来。上限由自家规则封在 100,这里只填上游的下限
// (来源行号写在各游戏的申报旁)。
export const width = (min: number, key = 'w'): Field => ({
  kind: 'int',
  key,
  label: 'Width',
  word: 'width',
  min,
  max: BOARD_MAX,
  role: 'width',
})

export const height = (min: number, key = 'h'): Field => ({
  kind: 'int',
  key,
  label: 'Height',
  word: 'height',
  min,
  max: BOARD_MAX,
  role: 'height',
})

// 难度:多数游戏的 DIFFCONFIG 都叫 "Difficulty",上游变量多数叫 diff,叫 difficulty 的
// 由游戏传进来;选项逐游戏给词。
export const difficulty = (options: readonly Word[], key = 'diff'): Field => ({
  kind: 'pick',
  key,
  label: 'Difficulty',
  word: 'difficulty',
  options,
})

// 打乱步数(sixteen / twiddle / netslide 同名同义):上游只要求非负,0 = 随机打乱。
// 上限是自家取的实用值:步数过了行列数的量级就和随机打乱分不出来了。
export const shuffles = (): Field => ({
  kind: 'int',
  key: 'movetarget',
  label: 'Number of shuffling moves',
  word: 'shuffles',
  min: 0,
  max: 1000,
  role: 'count',
  zero: 'random',
})

// ---------------------------------------------------------------- 与 C 控件的绑定

export type Bound = ReadonlyMap<number, Field>

const SPAN = /^(\d+)-(\d+)$/

// 字段按 label 认到控件上,种类要对得上;有一条对不上就整份不绑(回退到旧控件),
// 这说明申报和上游脱节了,不能带着半份申报去修值。
export function bind(custom: Custom, controls: readonly DialogControl[]): Bound | null {
  const bound = new Map<number, Field>()
  for (const field of custom.fields) {
    const at = controls.findIndex((c) => c.label === field.label)
    const control = controls[at]
    const ok =
      control !== undefined &&
      (field.kind === 'pick'
        ? control.kind === 'choices' && control.choices.length === field.options.length
        : field.kind === 'scale'
          ? control.kind === 'choices'
          : field.kind === 'flag'
            ? control.kind === 'boolean'
            : control.kind === 'string')
    if (!ok || bound.has(at)) {
      console.warn(`custom params: cannot bind "${field.label}"`)
      return null
    }
    bound.set(at, field)
    if (field.kind === 'scale' && control.kind === 'choices') {
      const s = modelOf(custom).scale.get(field.key)
      if (s) s.hi = control.choices.length - 1
    }
  }
  return bound
}

export function read(bound: Bound, controls: readonly DialogControl[]): Values {
  const values: Record<string, number> = {}
  for (const [at, field] of bound) {
    const control = controls[at]
    if (control.kind === 'boolean') values[keysOf(field)[0]] = control.value ? 1 : 0
    else if (control.kind === 'choices') values[keysOf(field)[0]] = control.value
    else if (field.kind === 'span') {
      const m = SPAN.exec(control.value.trim())
      const a = m ? Number(m[1]) : parseInt(control.value, 10)
      const b = m ? Number(m[2]) : a
      values[field.keys[0]] = a
      values[field.keys[1]] = b
    } else if (field.kind === 'float') values[field.key] = parseFloat(control.value)
    else values[keysOf(field)[0]] = parseInt(control.value, 10)
  }
  return values
}

// 只把变了的写回活对象(C 侧 accept 时从这些对象上读)。
export function write(
  bound: Bound,
  controls: readonly DialogControl[],
  was: Values,
  values: Values,
): void {
  for (const [at, field] of bound) {
    const control = controls[at]
    if (keysOf(field).every((k) => was[k] === values[k])) continue
    if (control.kind === 'boolean') control.value = values[keysOf(field)[0]] !== 0
    else if (control.kind === 'choices') control.value = values[keysOf(field)[0]]
    else if (field.kind === 'span') {
      const [a, b] = [values[field.keys[0]], values[field.keys[1]]]
      control.value = a === b ? String(a) : `${a}-${b}`
    } else if (field.kind === 'float') control.value = String(values[field.key])
    else control.value = String(values[keysOf(field)[0]])
  }
}
