// 方向键块的通用机器:方向键、常规功能键、上膛键、双层菜单、块的拼装。
// 全部吃 View/Board,看不见任何游戏。标签是 midend 的两词原样双传——
// 「同词抹空」已经废除,这里的每个判断都以两词俱在为前提。
// 逐游戏的奇异机制(rect 的拖拽记账、palisade 的画面读死活、guess 的三键……)
// 不在这里:那些是游戏代码,住在各游戏文件里,用这里导出的原语拼。
import type { IconName } from '../../ui/Icon'
import type {
  Armed,
  ArrowKey,
  Arrows,
  Board,
  Face,
  Labels,
  Mods,
  Slot,
  Stroke,
  View,
  Words,
} from '../game'

export type Way = 'up' | 'down' | 'left' | 'right'
export type Diag = 'upLeft' | 'upRight' | 'downLeft' | 'downRight'
export type Dir = Way | Diag

// 斜向走位借小键盘的 7/9/1/3,必须报 NUMPAD location,否则引擎当字符键收。
export const DIRS: Record<Dir, { stroke: Stroke; icon: IconName }> = {
  up: { stroke: 'ArrowUp', icon: 'arrowUp' },
  down: { stroke: 'ArrowDown', icon: 'arrowDown' },
  left: { stroke: 'ArrowLeft', icon: 'arrowLeft' },
  right: { stroke: 'ArrowRight', icon: 'arrowRight' },
  upLeft: { stroke: { key: '7', pad: true }, icon: 'arrowUpLeft' },
  upRight: { stroke: { key: '9', pad: true }, icon: 'arrowUpRight' },
  downLeft: { stroke: { key: '1', pad: true }, icon: 'arrowDownLeft' },
  downRight: { stroke: { key: '3', pad: true }, icon: 'arrowDownRight' },
}

export const PUSH: Record<Way, IconName> = {
  up: 'pushUp',
  down: 'pushDown',
  left: 'pushLeft',
  right: 'pushRight',
}

export const PAINT: Record<Way, IconName> = {
  up: 'sweepUp',
  down: 'sweepDown',
  left: 'sweepLeft',
  right: 'sweepRight',
}

const withMods = (stroke: Stroke, mods: Mods | undefined): Stroke => {
  if (!mods || (!mods.shift && !mods.ctrl)) return stroke
  const base = typeof stroke === 'string' ? { key: stroke } : stroke
  return { ...base, ...(mods.shift ? { shift: true as const } : {}), ...(mods.ctrl ? { ctrl: true as const } : {}) }
}

// 上了膛的修饰键跟这一步一起发,发出去且真改了局面才卸膛——撞墙那一下没改成,
// 膛得留着让人再走一次。
export function walk<F>(board: Board<F>, dir: Dir, mods?: Mods): void {
  const armed = board.view().armed
  const before = armed ? board.gate((g) => g.read()) : undefined
  board.send(withMods(DIRS[dir].stroke, armed?.mods ?? mods))
  if (armed && board.gate((g) => g.read()) !== before) board.arm(null)
}

export const arrowFace = <F>(view: View<F>, dir: Dir): Face => ({
  art: { glyph: DIRS[dir].icon },
  says: view.words.arrows[dir],
})

export const step = <F>(dir: Dir, slot: Slot): ArrowKey<F> => ({
  id: dir,
  slot,
  moves: true,
  face: (view) => arrowFace(view, dir),
  press: (board) => walk(board, dir),
})

// 四个方向键的惯常落位:左=1 下=2 右=3 上=5。
export const cross = <F>(): ArrowKey<F>[] => [
  step('left', 1),
  step('down', 2),
  step('right', 3),
  step('up', 5),
]

// ---------------------------------------------------------------- 标签判断

export const labelsSilent = (labels: Labels) => !labels.enter && !labels.space

export const understood = (words: readonly string[], labels: Labels) =>
  [labels.enter, labels.space].every((w) => !w || words.includes(w))

// 这个键此刻按了有没有用。两词俱空 = 上游此刻不认确认键(光标隐藏之类);
// Enter 之外的键(空格、字面键)沿用「两词俱空才算死」的口径——那些游戏的
// 报空恰好都表示同一件事。
const doesNothing = (key: string, labels: Labels) =>
  key === 'Enter' ? !labels.enter : !labels.enter && !labels.space

// 自己这个键此刻的词。
export const wordOf = (key: string, labels: Labels) =>
  key === 'Enter' ? labels.enter : labels.space

// ---------------------------------------------------------------- 常规功能键

export type CursorWord = keyof Words['cursor']

export type FaceSpec = {
  glyph: IconName
  word: CursorWord
  on?: boolean
  // 认得这个词但此刻不该亮出来(第二层的待命脸):画出来、置灰。
  idle?: true
}

export type ActSpec<F> = {
  id: string
  slot: Slot
  key: string
  idle: FaceSpec
  layer?: 1 | 2
  // 本游戏两个确认键会报的词全集;报出词汇之外的词时机器整个退让
  // (键回落到 doesNothing 判据),防上游升级换词后按错。
  words?: readonly string[]
  // 按词换脸。词不在脸谱里就置灰戴默认脸——多张脸的判据见 docs/keys.md。
  faces?: Partial<Record<string, FaceSpec>>
  // 按结果命名:名字是结果,由标签反查此刻哪个键给出它。
  does?: string
  // 要不到 does 时改要 instead——「没有人提供我要的词」恰好等于「这一格已经是它」。
  instead?: string
  // instead 的变体:对方词在场时先按对方语义顶掉,再落自己(singles 的圈↔黑)。
  twice?: true
  // 对方记号上一按替换:先发对方的键清掉,再发自己的;清完发现自己没得发就撤回。
  replaces?: string
  // 已经是自己时改发这个键(tents 的 B)。
  switches?: string
  // 额外的激活判据(tents 读脚下),叠加在标签推导之上。
  on?: (view: View<F>) => boolean
  // 幂等例外:键按下去无事发生也不灭(pattern 的三个颜色键,全 app 唯一)。
  // 只豁免「幂等」,不豁免「无光标」——两词俱空照样灭。
  lit?: true
  // 上游不报标签(current_key_label 注册 NULL)但键读别的路能用:恒可按。
  mute?: true
  // 不看光标干活(flood 的 Advance):镜像光标睡着也不灭。
  offCursor?: true
  // 词的覆盖:标签之外还要看事实才知道此刻是哪张脸的游戏(rect 的拖拽记账、
  // pearl 的走没走过格)从这里注入哨兵词,哨兵脸写进 faces。
  word?: (view: View<F>) => string
  // 按下先做的私事(pattern 选笔刷)。
  aside?: (board: Board<F>) => void
  // 选中环(pattern 多笔刷)。
  ring?: (view: View<F>) => boolean
  held?: (view: View<F>) => boolean
}

const gatedAsleep = <F>(spec: { offCursor?: true }, view: View<F>) =>
  !view.cursor && !spec.offCursor

const mine = <F>(spec: ActSpec<F>, view: View<F>) =>
  spec.word?.(view) ?? wordOf(spec.key, view.labels)

const holding = <F>(spec: ActSpec<F>, labels: Labels) =>
  !!spec.instead &&
  !!spec.does &&
  labels.enter !== spec.does &&
  labels.space !== spec.does &&
  (labels.enter === spec.instead || labels.space === spec.instead)

const overwrites = <F>(spec: ActSpec<F>, labels: Labels) =>
  !!spec.twice &&
  !!spec.does &&
  !holding(spec, labels) &&
  labels.enter !== spec.does &&
  labels.space !== spec.does &&
  !!(labels.enter || labels.space)

// replaces:自己此刻无词、对方正是那个记号,返回要先发的对方键。
const clears = <F>(spec: ActSpec<F>, labels: Labels): string | null => {
  if (!spec.replaces) return null
  const mineNow = wordOf(spec.key, labels)
  const theirs = spec.key === 'Enter' ? labels.space : labels.enter
  if (mineNow || theirs !== spec.replaces) return null
  return spec.key === 'Enter' ? ' ' : 'Enter'
}

// 判决:能按就给要发的键,按不动给原因——「按不动」有四个不同的来源,一个
// null 盖不住它们(pattern 的 lit 曾因此出过「没光标也全亮」的 bug):
//   asleep   镜像光标睡着
//   already  按结果命名的键要不到词 = 这一格已经是它(幂等)
//   blank    当前词不在脸谱里
//   idle     第二层的待命脸(画出来、按不动)
//   silent   两词俱空,上游此刻不认确认键
type Verdict =
  | { send: string }
  | { mute: 'asleep' | 'already' | 'blank' | 'idle' | 'silent' }

const wouldSend = <F>(spec: ActSpec<F>, view: View<F>): Verdict => {
  if (gatedAsleep(spec, view)) return { mute: 'asleep' }
  if (spec.mute) return { send: spec.key }
  const { labels } = view
  if (!spec.words || understood(spec.words, labels)) {
    if (spec.does) {
      // 两词俱空先于 does 的解析定性:它是 silent 不是 already,否则 lit 的
      // 幂等豁免会把「没光标」也放行(pattern 没光标时三个色键全亮的旧 bug)。
      if (labelsSilent(labels)) return { mute: 'silent' }
      if (overwrites(spec, labels)) return { send: spec.key }
      const asks = holding(spec, labels) ? spec.instead : spec.does
      if (labels.enter === asks) return { send: 'Enter' }
      if (labels.space === asks) return { send: ' ' }
      return { mute: 'already' }
    }
    if (spec.faces) {
      const face = spec.faces[mine(spec, view)]
      if (face) return face.idle ? { mute: 'idle' } : { send: spec.key }
      return clears(spec, labels) ? { send: spec.key } : { mute: 'blank' }
    }
  }
  return doesNothing(spec.key, view.labels) ? { mute: 'silent' } : { send: spec.key }
}

const faceFor = <F>(spec: ActSpec<F>, view: View<F>): FaceSpec => {
  const known =
    (!spec.words || understood(spec.words, view.labels)) && !gatedAsleep(spec, view)
  const face = known ? spec.faces?.[mine(spec, view)] : undefined
  return face ?? spec.idle
}

const reads = <F>(spec: ActSpec<F>, view: View<F>) => {
  const face = faceFor(spec, view)
  const set =
    !!face.on ||
    holding(spec, view.labels) ||
    (!!spec.switches && !!spec.on?.(view))
  return { face, set, verdict: wouldSend(spec, view) }
}

// 常规功能键:脸、能不能按、按下去发什么,全从上游那两句提示推。
export const act = <F>(spec: ActSpec<F>): ArrowKey<F> => ({
  id: spec.id,
  slot: spec.slot,
  layer: spec.layer,
  face: (view) => {
    const { face, set, verdict } = reads(spec, view)
    const said = view.words.cursor[face.word]
    return {
      art: { glyph: face.glyph },
      says: said,
      tip: true,
      on: set,
      ring: spec.ring?.(view),
      // lit 只豁免幂等(already):刷到一半按钮不许在拇指底下熄灭;
      // 别的原因(两词俱空、光标睡着)照灭。
      dead:
        !('send' in verdict) && !(spec.lit && verdict.mute === 'already'),
      held: spec.held
        ? spec.held(view)
        : spec.instead
          ? set
          : spec.faces
            ? !!face.on
            : undefined,
    }
  },
  press: (board) => {
    spec.aside?.(board)
    board.arm(null)
    const view = board.view()
    const { set, verdict } = reads(spec, view)
    if (!('send' in verdict)) return
    const key = verdict.send
    // 先清掉对家再补自己这一下;清完发现自己反而没得发,就把清的那步撤回去。
    const first = clears(spec, view.labels)
    if (first) {
      board.send(first)
      if (!('send' in wouldSend(spec, board.view()))) board.undo()
      else board.send(key)
      return
    }
    board.send(set && spec.switches ? spec.switches : key)
    if (overwrites(spec, view.labels)) board.send(key)
  },
})

// ---------------------------------------------------------------- 上膛键

export type ArmSpec = {
  id: string
  slot: Slot
  key?: string
  glyph: IconName
  word: CursorWord
  mods: Mods
  layer?: 1 | 2
}

// 上膛键:自己不发键,只决定下一次方向键带什么修饰键。
export const arm = <F>(spec: ArmSpec): ArrowKey<F> => ({
  id: spec.id,
  slot: spec.slot,
  layer: spec.layer,
  face: (view) => {
    const on = view.armed?.id === spec.id
    const said = view.words.cursor[spec.word]
    return {
      art: { glyph: spec.glyph },
      says: said,
      tip: true,
      on,
      held: on,
      dead: labelsSilent(view.labels),
    }
  },
  press: (board) => {
    const mine: Armed = { id: spec.id, mods: spec.mods }
    board.arm(board.view().armed?.id === spec.id ? null : mine)
  },
})

// ---------------------------------------------------------------- 双层菜单

// 第二层的语义是「光标正站在待定物上」:从标签里读哪层开着。词汇之外的词 =
// 机器退让,两层都摆出来。
export const layerByWords =
  <F>(words: readonly string[], second: readonly string[]) =>
  (view: View<F>): 1 | 2 | 'both' => {
    if (!understood(words, view.labels)) return 'both'
    return [view.labels.enter, view.labels.space].some((w) => !!w && second.includes(w))
      ? 2
      : 1
  }

// 镜像光标的游戏,光标睡着时第二层从不开(标签盲于可见性,词还挂在嘴上)。
export const layerByWordsAwake =
  <F>(words: readonly string[], second: readonly string[]) =>
  (view: View<F>): 1 | 2 | 'both' =>
    view.cursor ? layerByWords<F>(words, second)(view) : 1

// ---------------------------------------------------------------- 拼装

const rowOf = (slot: Slot) => (slot <= 3 ? 1 : slot <= 6 ? 2 : 3)
// 核心三列是网格的第 2..4 列(第 1 列整块塞四个固定键)。
const colOf = (slot: Slot) => 1 + ((slot - 1) % 3)

export type PadButton = {
  id: string
  slot: Slot
  // CSS 的行列号,从上往下、从左往右数——已经把格子号翻过来了。
  row: number
  col: number
  gone: boolean
  face: Face
  press(): void
}

export function padButtons<F>(
  arrows: Arrows<F>,
  view: View<F>,
  board: Board<F>,
): { rows: number; buttons: PadButton[] } {
  const slots = [...new Set(arrows.keys.map((k) => k.slot))].sort((a, b) => a - b)
  if (slots.length === 0) return { rows: 0, buttons: [] }

  // 行数按「注册了什么」算,不按「这一刻摆着什么」:键来来去去时块不该跟着蹦。
  const rows = Math.max(...slots.map(rowOf))
  const layer = arrows.layer?.(view) ?? 1

  const buttons: PadButton[] = []
  for (const slot of slots) {
    for (const key of arrows.keys) {
      if (key.slot !== slot) continue
      if (key.layer !== undefined && layer !== 'both' && key.layer !== layer) continue
      const face = key.face(view)
      if (!face) continue
      buttons.push({
        id: key.id,
        slot,
        row: rows + 1 - rowOf(slot),
        col: colOf(slot),
        // 上膛时别的功能键退场,方向键和上膛键自己留着;位置留着(visibility 藏),
        // iOS 上卸载再插回会画成残片。
        gone: !key.moves && view.armed !== null && view.armed.id !== key.id,
        face,
        press: () => key.press(board),
      })
      break
    }
  }
  return { rows, buttons }
}
