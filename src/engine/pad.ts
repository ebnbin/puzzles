// 方向键那一块(下方区域右边的底板)。**最多 3×3**,格子编号从下往上、每行从左到右,
// 和屏幕的自上而下反着——记反了整块就翻个个儿:
//      7  8  9
//      4  5  6
//      1  2  3
// 整条键盘是一个 4 列的网格:第一列整块塞那四个固定键,后三列是方向键这九格。
// 这里住的是 arrow 那一类(五类按钮的名字见 types.ts)。九格对四十个游戏够用,前提
// 是 Guess 和 Map 的颜色键不在这儿——那些是 pick,写在 keys.ts,跟同一个开关来去却
// 排在上方区域。别往这儿加第十格:上一版为了塞下 Guess 的十种颜色扩到过 13 格,连带
// 出一个窄键窄缝的压缩档,判据见 docs/keys.md。
// 每个游戏把自己的键钉死在格子号上,没人注册的行整行不画,块就矮一截。注册项是
// 数据加方法:face() 回答「这一刻长什么样」(null = 这一刻不摆),press() 收 ctx
// 自己动手;亮、按不动、描边、退场这些状态位对每个键一视同仁,用不用由 face()
// 说了算。逐游戏的判据在 docs/keys.md,改这里要同步改它。
import type { IconName } from '../Icon'
import { preference } from './keys'
import type { Paint } from './map'
import type { Border, Stand } from './palisade'
import type { DialogControl } from './types'

export type Slot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// 核心三列就是网格的前三列。顶行不吃列,自己排。
const CORE_COL = 1

const rowOf = (slot: Slot) => (slot <= 3 ? 1 : slot <= 6 ? 2 : 3)

const colOf = (slot: Slot) => CORE_COL + ((slot - 1) % 3)

type Mod = { shift?: true; ctrl?: true }

type Way = 'up' | 'down' | 'left' | 'right'
type Diag = 'upLeft' | 'upRight' | 'downLeft' | 'downRight'
type Dir = Way | Diag

type PadWords = {
  arrows: Record<Dir, string> & {
    shove: Record<Way, string>
    paint: Record<Way, string>
  }
  cursor: Record<CursorWord, string>
  keys: {
    clear: string
    done: string
    lock: string
  }
}

type PadFace = {
  icon?: IconName
  says: string
  // 长按才问的那句;不给就是长按无话可说(方向键要连按,不能被提示打断)。
  tip?: string
  on?: boolean
  ring?: boolean
  dead?: boolean
  pressed?: boolean
}

type PadEntry = {
  // 数据只留框架自己要用的:上膛之后方向键要带的修饰键、这个键是哪把刷子。
  mod?: Mod
  brush?: Mod
  // 方向键。上膛时退场的是别的功能键,方向键得留着,不然上了膛就没处走。
  moves?: true
  face(ctx: PadHere): PadFace | null
  press(ctx: PadHere): void
}

type Pad = Partial<Record<Slot, PadEntry | PadEntry[]>>

export type PadButton = PadFace & {
  slot: Slot
  // CSS 的行列号,从上往下、从左往右数——已经把格子号翻过来了。
  row: number
  col: number
  gone: boolean
  press(): void
}

export type PadContext = {
  name: string
  // 拼齐的一份:opened/walked/stand 都在里面。下面的判据没有一个只吃半份。
  labels: KeyLabels
  awake: boolean
  sweeping: boolean
  onClue: boolean
  maybe: boolean
  held: string | null
  rolling: ReadonlySet<string> | null
  primed: Slot | null
  brush: Slot | null
  words: PadWords
  send(key: string, where?: number, mod?: Mod): void
  save(): string | undefined
  undo(): void
  prime(slot: Slot | null): void
  paint(p: Paint): void
  toggleMaybe(): void
  toggleSweep(): void
  setBrush(slot: Slot): void
  // 连发时要「刚发完那一下之后」的标签,渲染时拿的那份已经过期了。
  labelsNow(): KeyLabels
}

type PadHere = PadContext & {
  slot: Slot
  asleep: boolean
  painting: boolean
  armed: Mod | null
  brushAt: Slot | null
  brushMod: Mod | null
  picksBrush: boolean
}

type CursorKey = {
  key: string
  paints?: { colour: number; pencil?: boolean }
  arms?: boolean
  icon: IconName
  says: CursorWord
  does?: string
  instead?: string
  twice?: true
  switches?: string
  primes?: { shift?: true; ctrl?: true }
  brush?: { shift?: true; ctrl?: true }
  sweeps?: boolean
  lit?: boolean
  holds?: Border
  replaces?: string
  level?: 1 | 2
  faces?: Record<string, CursorFace>
  offCursor?: boolean
}

type CursorFace = {
  icon: IconName
  says: CursorWord
  on?: boolean
  idle?: boolean
}

type CursorWord =
  | 'rotateLeft'
  | 'lock'
  | 'pencil'
  | 'black'
  | 'white'
  | 'grey'
  | 'sweep'
  | 'carryTile'
  | 'holdPlace'
  | 'turnLeft'
  | 'turnRight'
  | 'slide'
  | 'pushLine'
  | 'pullLine'
  | 'jump'
  | 'unjump'
  | 'domino'
  | 'undomino'
  | 'line'
  | 'unline'
  | 'drag'
  | 'cycle'
  | 'fire'
  | 'ball'
  | 'unball'
  | 'check'
  | 'lockCell'
  | 'unlockCell'
  | 'slash'
  | 'backslash'
  | 'noLine'
  | 'light'
  | 'unlight'
  | 'cannot'
  | 'uncannot'
  | 'tent'
  | 'grass'
  | 'clearSquare'
  | 'blackSquare'
  | 'restore'
  | 'circle'
  | 'uncircle'
  | 'whiteSquare'
  | 'emptySquare'
  | 'fillSquare'
  | 'dotSquare'
  | 'plus'
  | 'minus'
  | 'blankDomino'
  | 'notBlankDomino'
  | 'track'
  | 'noTrack'
  | 'floodFill'
  | 'advance'
  | 'edge'
  | 'noEdge'
  | 'startBridge'
  | 'endBridge'
  | 'islandDone'
  | 'buildBridge'
  | 'noBridge'
  | 'linkFrom'
  | 'linkTo'
  | 'endLink'
  | 'cancelLink'
  | 'startLoop'
  | 'endLoop'
  | 'cancelLoop'
  | 'crossNext'
  | 'newArrow'
  | 'moveArrow'
  | 'dropArrow'
  | 'removeArrow'
  | 'cancelArrow'
  | 'drawEdge'
  | 'clearEdge'
  | 'maybeMode'
  | 'clearRegion'
  | 'submit'
  | 'hold'
  | 'flip'
  | 'select'
  | 'unselect'
  | 'remove'
  | 'uncover'
  | 'chord'
  | 'flag'
  | 'unflag'
  | 'mark'
  | 'erase'
  | 'done'
  | 'cancel'

export type KeyLabels = {
  enter: string
  space: string
  opened?: string
  walked?: boolean
  stand?: Stand
}

const CURSOR_LIFE: Record<string, readonly string[]> = {
  net: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Enter', ' ', 'a', 's', 'd', 'f', 'A', 'S', 'D', 'F'],
  samegame: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
  flip: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
  dominosa: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  flood: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  map: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
}

const mirrorsCursor = (name: string) => name in CURSOR_LIFE

const gated = (name: string, cursor: CursorKey) =>
  mirrorsCursor(name) && !cursor.offCursor

export function opener(name: string, labels: KeyLabels, was: string | null) {
  if (name === 'signpost') {
    if (labels.space !== '') return null
    if (labels.enter === 'To here') return 'Enter'
    if (labels.enter === 'From here') return ' '
    return labels.enter === 'Cancel' ? was : null
  }
  if (name !== 'rect') return null
  if (labels.enter === 'Done') return 'Enter'
  if (labels.space === 'Done') return ' '
  if (labels.enter !== 'Cancel') return null
  return was
}

export const opens = (name: string, key: string, labels: KeyLabels) =>
  (key === 'Enter' || key === ' ') &&
  (name === 'rect'
    ? labels.enter === 'Mark'
    :
      name === 'signpost' && labels.space !== '')

export const dragWalked = (name: string, key: string): boolean | null => {
  if (name !== 'pearl') return null
  if (key === 'Enter' || key === ' ') return false
  return key.startsWith('Arrow') ? true : null
}

export const wakesCursor = (name: string, key: string) =>
  CURSOR_LIFE[name]?.includes(key) ?? false

const doesNothing = (key: string, labels: KeyLabels) =>
  key === 'Enter' ? !labels.enter : !labels.enter && !labels.space

const WORDS: Record<string, readonly string[]> = {
  pattern: ['Black', 'White', 'Grey'],
  sixteen: ['Slide', 'Back', 'Lock tile', 'Lock pos', 'Unlock'],
  rect: ['Mark', 'Erase', 'Done', 'Cancel'],
  mines: ['Uncover', 'Clear', 'Mark', 'Unmark'],
  samegame: ['Select', 'Remove', 'Unselect'],
  pegs: ['Select', 'Cancel'],
  dominosa: ['Place', 'Remove', 'Line'],
  blackbox: ['Fire', 'Ball', 'Clear', 'Check', 'Lock', 'Unlock'],

  lightup: ['Light', 'Mark', 'Clear'],
  singles: ['Black', 'Circle', 'Restore', 'Remove'],
  unruly: ['Black', 'White', 'Empty'],
  mosaic: ['Black', 'White', 'Empty'],
  range: ['Fill', 'Dot', 'Empty'],
  magnets: ['+', '-', 'X', '?', 'Clear'],
  tracks: ['Track', 'X', 'Clear'],
  flood: ['Fill', 'Advance'],
  inertia: ['Advance'],
  bridges: ['Select', 'Finished'],
  signpost: ['From here', 'To here', 'Cancel'],
  pearl: ['Start', 'Stop', 'Cancel'],
  galaxies: ['New arrow', 'Move arrow', 'Place', 'Remove', 'Cancel', 'Edge', 'Clear'],
}

const silent = (labels: KeyLabels) => !labels.enter && !labels.space

const understood = (name: string, labels: KeyLabels) => {
  const words = WORDS[name]
  return !!words && [labels.enter, labels.space].every((w) => !w || words.includes(w))
}

const SECOND: Record<string, readonly string[]> = {
  samegame: ['Remove'],
  inertia: ['Advance'],
  flood: ['Advance'],
  pearl: ['Stop'],
}

const inMenu = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
) => {
  if (!cursor.level) return true
  if (gated(name, cursor) && !awake) return false
  if (!understood(name, labels)) return true
  const second = SECOND[name]
  const open =
    !!second && [labels.enter, labels.space].some((w) => !!w && second.includes(w))
  return cursor.level === 2 ? open : !open
}

const SILENT = new Set(['untangle', 'palisade'])

const holding = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.instead &&
  !!cursor.does &&
  labels.enter !== cursor.does &&
  labels.space !== cursor.does &&
  (labels.enter === cursor.instead || labels.space === cursor.instead)

const overwrites = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.twice &&
  !!cursor.does &&
  !holding(cursor, labels) &&
  labels.enter !== cursor.does &&
  labels.space !== cursor.does &&
  !!(labels.enter || labels.space)

const clears = (cursor: CursorKey, labels: KeyLabels): string | null => {
  if (!cursor.replaces) return null
  const mineNow = cursor.key === 'Enter' ? labels.enter : labels.space
  const theirs = cursor.key === 'Enter' ? labels.space : labels.enter
  if (mineNow || theirs !== cursor.replaces) return null
  return cursor.key === 'Enter' ? ' ' : 'Enter'
}

const laid = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.holds && labels.stand?.has === cursor.holds

const buries = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.holds &&
  !!labels.stand?.live &&
  labels.stand.has !== null &&
  labels.stand.has !== 'none' &&
  labels.stand.has !== cursor.holds

const wouldSend = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
): string | null => {
  if (gated(name, cursor) && !awake) return null
  if (cursor.holds) return !labels.stand || labels.stand.live ? cursor.key : null
  if (SILENT.has(name)) return cursor.key
  if (understood(name, labels)) {
    if (cursor.does) {
      if (overwrites(cursor, labels)) return cursor.key
      const asks = holding(cursor, labels) ? cursor.instead : cursor.does
      if (labels.enter === asks) return 'Enter'
      if (labels.space === asks) return ' '
      return null
    }
    if (cursor.faces) {
      const face = cursor.faces[mine(name, cursor, labels)]
      if (face) return face.idle ? null : cursor.key
      return clears(cursor, labels) ? cursor.key : null
    }
  }
  return doesNothing(cursor.key, labels) ? null : cursor.key
}

const BOTH: Record<string, readonly string[]> = {
  rect: ['Cancel'],
  bridges: ['Finished'],
  signpost: ['From here', 'To here', 'Cancel'],
}

const mine = (name: string, cursor: CursorKey, labels: KeyLabels) => {
  const word =
    cursor.key === 'Enter'
      ? labels.enter
      : labels.space || (BOTH[name]?.includes(labels.enter) ? labels.enter : '')
  if (WAITING[name] === word && labels.space === '' && labels.opened)
    return cursor.key === labels.opened ? PENDING : word
  if (name === 'pearl' && word === 'Stop' && !labels.walked) return UNTRODDEN
  if (name === 'signpost' && labels.space === '' && word && labels.opened) {
    if (cursor.key === labels.opened) return word === 'Cancel' ? PENDING : word
    return word === 'Cancel' ? word : IDLING
  }
  return word
}

const WAITING: Record<string, string> = { rect: 'Cancel' }
const PENDING = '\0waiting'
const IDLING = '\0idling'

const UNTRODDEN = '\0untrodden'

const faceOf = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
): CursorFace => {
  const word = mine(name, cursor, labels)
  const known = understood(name, labels) && (awake || !gated(name, cursor))
  const face = known ? cursor.faces?.[word] : undefined
  return face ?? { icon: cursor.icon, says: cursor.says }
}

// 斜向走位借的是小键盘的 7/9/1/3,location 必须报 NUMPAD,否则引擎当字符键收。
const NUMPAD = 3

const DIRS: Record<Dir, { key: string; where: number; icon: IconName }> = {
  up: { key: 'ArrowUp', where: 0, icon: 'arrowUp' },
  down: { key: 'ArrowDown', where: 0, icon: 'arrowDown' },
  left: { key: 'ArrowLeft', where: 0, icon: 'arrowLeft' },
  right: { key: 'ArrowRight', where: 0, icon: 'arrowRight' },
  upLeft: { key: '7', where: NUMPAD, icon: 'arrowUpLeft' },
  upRight: { key: '9', where: NUMPAD, icon: 'arrowUpRight' },
  downLeft: { key: '1', where: NUMPAD, icon: 'arrowDownLeft' },
  downRight: { key: '3', where: NUMPAD, icon: 'arrowDownRight' },
}

const PUSH: Record<Way, IconName> = {
  up: 'pushUp',
  down: 'pushDown',
  left: 'pushLeft',
  right: 'pushRight',
}

const PAINT: Record<Way, IconName> = {
  up: 'sweepUp',
  down: 'sweepDown',
  left: 'sweepLeft',
  right: 'sweepRight',
}

// 上了膛的修饰键跟这一步一起发,发出去且真改了局面才卸膛——撞墙那一下没改成,
// 膛得留着让人再走一次。
const walk = (ctx: PadHere, dir: Dir, mod?: Mod) => {
  const armed = ctx.armed
  const before = armed ? ctx.save() : undefined
  ctx.send(DIRS[dir].key, DIRS[dir].where, armed ?? mod)
  if (armed && ctx.save() !== before) ctx.prime(null)
}

const plain = (ctx: PadHere, dir: Dir): PadFace => ({
  icon: DIRS[dir].icon,
  says: ctx.words.arrows[dir],
})

const step = (dir: Dir): PadEntry => ({
  moves: true,
  face: (ctx) => plain(ctx, dir),
  press: (ctx) => walk(ctx, dir),
})

// sixteen:锁住一块砖之后方向键推的是整行整列,图标和读法都换一套。
const shove = (dir: Way): PadEntry => ({
  moves: true,
  face: (ctx) =>
    ctx.labels.enter === 'Unlock' || ctx.labels.space === 'Unlock'
      ? { icon: PUSH[dir], says: ctx.words.arrows.shove[dir] }
      : plain(ctx, dir),
  press: (ctx) => walk(ctx, dir),
})

// pattern:开着「边走边涂」时方向键沿路上色,带的修饰键就是当前那把刷子。
const stroke = (dir: Way): PadEntry => ({
  moves: true,
  face: (ctx) =>
    ctx.painting && ctx.brushMod
      ? { icon: PAINT[dir], says: ctx.words.arrows.paint[dir] }
      : plain(ctx, dir),
  press: (ctx) => walk(ctx, dir, (ctx.painting && ctx.brushMod) || undefined),
})

// cube:骰子只能往有格子的方向滚。
const roll = (dir: Way): PadEntry => ({
  moves: true,
  face: (ctx) => ({
    ...plain(ctx, dir),
    dead: !!ctx.rolling && !ctx.rolling.has(DIRS[dir].key),
  }),
  press: (ctx) => walk(ctx, dir),
})

const reads = (ctx: PadHere, cursor: CursorKey) => {
  const face = faceOf(ctx.name, cursor, ctx.labels, ctx.awake)
  const set =
    face.on ||
    holding(cursor, ctx.labels) ||
    laid(cursor, ctx.labels) ||
    (!!cursor.switches && ctx.held === cursor.key)
  return { face, set, key: wouldSend(ctx.name, cursor, ctx.labels, ctx.awake) }
}

// 常规功能键:脸、能不能按、按下去发什么,全从上游那两句提示(lsk/csk)推。
const act = (cursor: CursorKey): PadEntry => ({
  brush: cursor.brush,
  face: (ctx) => {
    if (!inMenu(ctx.name, cursor, ctx.labels, ctx.awake)) return null
    const { face, set, key } = reads(ctx, cursor)
    const chosen = !!cursor.brush && ctx.picksBrush && ctx.brushAt === ctx.slot
    const said = ctx.words.cursor[face.says]
    return {
      icon: face.icon,
      says: said,
      tip: said,
      on: set,
      ring: ctx.painting && chosen,
      dead: key === null && (!cursor.lit || ctx.asleep),
      pressed: cursor.instead
        ? set
        : cursor.faces
          ? !!face.on
          : cursor.brush && ctx.picksBrush
            ? ctx.painting && chosen
            : undefined,
    }
  },
  press: (ctx) => {
    if (cursor.brush) ctx.setBrush(ctx.slot)
    ctx.prime(null)
    const { set, key } = reads(ctx, cursor)
    if (key === null) return
    // 先清掉对家再补自己这一下;清完发现自己反而没得发,就把清的那步撤回去。
    const first = clears(cursor, ctx.labels)
    if (first) {
      ctx.send(first)
      if (wouldSend(ctx.name, cursor, ctx.labelsNow(), ctx.awake) === null) ctx.undo()
      else ctx.send(key)
      return
    }
    ctx.send(set && cursor.switches ? cursor.switches : key)
    if (overwrites(cursor, ctx.labels)) ctx.send(key)
    if (buries(cursor, ctx.labels)) ctx.send(key)
  },
})

// 上膛键:自己不发键,只决定下一步方向键带什么修饰键。
const arm = (cursor: CursorKey): PadEntry => ({
  mod: cursor.primes,
  face: (ctx) => {
    if (!inMenu(ctx.name, cursor, ctx.labels, ctx.awake)) return null
    const on = ctx.primed === ctx.slot
    const said = ctx.words.cursor[cursor.says]
    return {
      icon: cursor.icon,
      says: said,
      tip: said,
      on,
      pressed: on,
      dead: !ctx.labels.enter && !ctx.labels.space,
    }
  },
  press: (ctx) => ctx.prime(ctx.primed === ctx.slot ? null : ctx.slot),
})

// pattern 的「边走边涂」开关。
const sweep = (cursor: CursorKey): PadEntry => ({
  face: (ctx) => {
    const said = ctx.words.cursor[cursor.says]
    return {
      icon: cursor.icon,
      says: said,
      tip: said,
      on: ctx.painting,
      pressed: ctx.painting,
      dead: ctx.asleep,
    }
  },
  press: (ctx) => ctx.toggleSweep(),
})

// map 的整片上色:一个切铅笔、一个擦干净,都要光标先醒着。
const region = (cursor: CursorKey): PadEntry => ({
  face: (ctx) => {
    const on = !!cursor.arms && ctx.maybe && ctx.awake
    const said = ctx.words.cursor[cursor.says]
    return {
      icon: cursor.icon,
      says: said,
      tip: said,
      on,
      pressed: cursor.arms ? on : undefined,
      dead: !ctx.awake || (cursor.paints !== undefined && ctx.onClue),
    }
  },
  press: (ctx) => {
    if (cursor.paints) ctx.paint(cursor.paints)
    else ctx.toggleMaybe()
  },
})

const PENCIL: CursorKey = { key: 'Enter', icon: 'pencil', says: 'pencil' }

const CURSOR_MODE = ['Half-grid', 'Full-grid']

// guess 的三个功能键全是上游自己的键,脸和死活一律读 current_key_label——它报
// 什么我们照抄什么,三处置灰一一对应上游那三个 if,不是我们定的判据:
//   光标在钉子上   Place / Hold  → 保留、删除亮,看结果灰
//   光标在看结果位 Submit / ""   → 只有看结果亮
//   解出来了       "" / ""       → 三个全灰
// Enter 落在钉子上时上游是「放下调色板光标那个颜色」,那件事上方区域每个圆键都做,
// 所以这个键只留提交那半边——判据一,够得着的不给键。
const SUBMIT: PadEntry = {
  face: (ctx) => ({
    icon: 'done',
    says: ctx.words.keys.done,
    tip: ctx.words.keys.done,
    dead: ctx.labels.enter !== 'Submit',
  }),
  press: (ctx) => ctx.send('\r'),
}

// 光标停在「看结果」位时上游 return NULL。
const HOLD: PadEntry = {
  face: (ctx) => ({
    icon: 'lock',
    says: ctx.words.keys.lock,
    tip: ctx.words.keys.lock,
    dead: ctx.labels.space !== 'Hold',
  }),
  press: (ctx) => ctx.send(' '),
}

// 清掉光标那颗,光标不动——上游的 '\b' 就是这样。它在「看结果」位上没有守卫,
// 会去读写 curr_pegs->pegs[npegs](只分配了 npegs 个),所以那一位必须灰掉:
// 这是越界的唯一一道拦。
const ERASE: PadEntry = {
  face: (ctx) => ({
    icon: 'clear',
    says: ctx.words.keys.clear,
    tip: ctx.words.keys.clear,
    dead: ctx.labels.enter !== 'Place',
  }),
  press: (ctx) => ctx.send('\b'),
}

type Table = Pad | ((id: string, prefs: readonly DialogControl[]) => Pad)

// 四个方向键在大多数游戏里坐同样四格,还是逐个游戏写全:哪天谁要挪一格、或者
// 换一种走位(sixteen 推行、cube 滚、pattern 沿路涂),改的只是它自己那几行。
const PAD: Record<string, Table> = {
  net: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'rotate', says: 'rotateLeft' }),
    6: act({ key: ' ', icon: 'lock', says: 'lock' }),
  },

  cube: {
    1: roll('left'), 2: roll('down'), 3: roll('right'), 5: roll('up'),
  },

  fifteen: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
  },

  sixteen: {
    1: shove('left'), 2: shove('down'), 3: shove('right'), 5: shove('up'),
    4: act({
      key: 'Enter',
      icon: 'lockTile',
      says: 'carryTile',
      faces: {
        'Lock tile': { icon: 'lockTile', says: 'carryTile' },
        Unlock: { icon: 'lockTileOn', says: 'carryTile', on: true },
        Slide: { icon: 'primary', says: 'pushLine' },
      },
    }),
    6: act({
      key: ' ',
      icon: 'lockPlace',
      says: 'holdPlace',
      faces: {
        'Lock pos': { icon: 'lockPlace', says: 'holdPlace' },
        Unlock: { icon: 'lockPlaceOn', says: 'holdPlace', on: true },
        Back: { icon: 'secondary', says: 'pullLine' },
      },
    }),
  },

  twiddle: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'turnLeft', says: 'turnLeft' }),
    6: act({ key: ' ', icon: 'turnRight', says: 'turnRight' }),
  },

  rect: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'mark',
      says: 'mark',
      faces: {
        Mark: { icon: 'mark', says: 'mark' },
        Done: { icon: 'done', says: 'done' },
        Cancel: { icon: 'cancel', says: 'cancel' },
        [PENDING]: { icon: 'done', says: 'done', idle: true },
      },
    }),
    6: act({
      key: ' ',
      icon: 'erase',
      says: 'erase',
      faces: {
        Erase: { icon: 'erase', says: 'erase' },
        Done: { icon: 'done', says: 'done' },
        Cancel: { icon: 'cancel', says: 'cancel' },
        [PENDING]: { icon: 'done', says: 'done', idle: true },
      },
    }),
  },

  netslide: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'primary', says: 'slide' }),
  },

  pattern: {
    1: stroke('left'), 2: stroke('down'), 3: stroke('right'), 5: stroke('up'),
    4: sweep({ key: '', icon: 'sweep', says: 'sweep', sweeps: true }),
    7: act({ key: 'Enter', icon: 'black', says: 'black', does: 'Black', lit: true, brush: { ctrl: true } }),
    8: act({ key: ' ', icon: 'white', says: 'white', does: 'White', lit: true, brush: { shift: true } }),
    9: act({
      key: 'Enter',
      icon: 'grey',
      says: 'grey',
      does: 'Grey',
      lit: true,
      brush: { shift: true, ctrl: true },
    }),
  },

  solo: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act(PENCIL),
  },

  mines: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'uncover',
      says: 'uncover',
      faces: {
        Uncover: { icon: 'uncover', says: 'uncover' },
        Clear: { icon: 'chord', says: 'chord' },
      },
    }),
    6: act({
      key: ' ',
      icon: 'flag',
      says: 'flag',
      faces: {
        Mark: { icon: 'flag', says: 'flag' },
        Unmark: { icon: 'flag', says: 'unflag' },
      },
    }),
  },

  samegame: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'select',
      says: 'select',
      faces: {
        Select: { icon: 'select', says: 'select' },
        Remove: { icon: 'done', says: 'remove', on: true },
      },
    }),
    6: act({ key: ' ', icon: 'cancel', says: 'unselect', does: 'Unselect', level: 2 }),
  },

  flip: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'flip', says: 'flip' }),
  },

  pegs: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'jump',
      says: 'jump',
      faces: {
        Select: { icon: 'jump', says: 'jump' },
        Cancel: { icon: 'cancel', says: 'unjump', on: true },
      },
    }),
  },

  dominosa: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'domino',
      says: 'domino',
      faces: {
        Place: { icon: 'domino', says: 'domino' },
        Remove: { icon: 'dominoOn', says: 'undomino', on: true },
      },
    }),
    6: act({
      key: ' ',
      icon: 'line',
      says: 'line',
      faces: {
        Line: { icon: 'line', says: 'line' },
        Remove: { icon: 'lineOn', says: 'unline', on: true },
      },
    }),
  },

  untangle: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'vertex', says: 'drag' }),
    6: act({ key: ' ', icon: 'cycle', says: 'cycle' }),
  },

  blackbox: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'ball',
      says: 'ball',
      faces: {
        Fire: { icon: 'laser', says: 'fire' },
        Ball: { icon: 'ball', says: 'ball' },
        Clear: { icon: 'ballOn', says: 'unball', on: true },
        Check: { icon: 'done', says: 'check' },
      },
    }),
    6: act({
      key: ' ',
      icon: 'lock',
      says: 'lockCell',
      faces: {
        Lock: { icon: 'lock', says: 'lockCell' },
        Unlock: { icon: 'unlock', says: 'unlockCell', on: true },
      },
    }),
  },

  slant: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    7: act({ key: '\\', icon: 'backslash', says: 'backslash' }),
    8: act({ key: '/', icon: 'slash', says: 'slash' }),
    9: act({ key: '\b', icon: 'bareSquare', says: 'noLine' }),
  },

  lightup: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'lamp',
      says: 'light',
      faces: {
        Light: { icon: 'lamp', says: 'light' },
        Clear: { icon: 'lamp', says: 'unlight', on: true },
      },
      replaces: 'Clear',
    }),
    6: act({
      key: ' ',
      icon: 'dotSquare',
      says: 'cannot',
      faces: {
        Mark: { icon: 'dotSquare', says: 'cannot' },
        Clear: { icon: 'dotSquare', says: 'uncannot', on: true },
      },
      replaces: 'Clear',
    }),
  },

  // 四个区域色占顶行,第一个凸进那道分隔列;上游没有任何键能说出一个颜色,
  // 这四个是我们自己的,走存档门(见 map.ts)。
  map: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: region({ key: '', icon: 'stipple', says: 'maybeMode', arms: true }),
    6: region({ key: '', icon: 'clear', says: 'clearRegion', paints: { colour: -1 } }),
  },

  // 只有左右:上下在上游是选颜色的,那件事被上方区域那排圆键顶替了。2 号格因此空着。
  guess: {
    1: step('left'), 3: step('right'),
    4: HOLD, 5: ERASE, 6: SUBMIT,
  },

  // 唯一走八方的:斜向占满四角,中间那格留给「一直滑到底」。
  inertia: {
    1: step('downLeft'), 2: step('down'), 3: step('downRight'),
    4: step('left'), 6: step('right'),
    7: step('upLeft'), 8: step('up'), 9: step('upRight'),
    5: act({ key: 'Enter', icon: 'advance', says: 'advance', level: 2 }),
  },

  tents: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'T', icon: 'tent', says: 'tent', switches: 'B' }),
    6: act({ key: 'N', icon: 'grass', says: 'grass', switches: 'B' }),
  },

  bridges: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    7: act({ key: ' ', icon: 'islandDone', says: 'islandDone' }),
    8: arm({ key: '', icon: 'bridge', says: 'buildBridge', primes: { ctrl: true } }),
    9: arm({ key: '', icon: 'noBridge', says: 'noBridge', primes: { shift: true } }),
  },

  unequal: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act(PENCIL),
  },

  galaxies: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'edge',
      says: 'drawEdge',
      faces: {
        Edge: { icon: 'edge', says: 'drawEdge' },
        Clear: { icon: 'noEdge', says: 'clearEdge', on: true },
        'New arrow': { icon: 'galaxyArrow', says: 'newArrow' },
        'Move arrow': { icon: 'galaxyArrow', says: 'moveArrow' },
        Place: { icon: 'done', says: 'dropArrow', on: true },
        Remove: { icon: 'cancel', says: 'removeArrow', on: true },
        Cancel: { icon: 'cancel', says: 'cancelArrow', on: true },
      },
    }),
  },

  filling: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
  },

  keen: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act(PENCIL),
  },

  towers: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act(PENCIL),
  },

  singles: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'black', says: 'blackSquare', does: 'Black', instead: 'Restore', twice: true }),
    6: act({ key: ' ', icon: 'circleSquare', says: 'circle', does: 'Circle', instead: 'Remove', twice: true }),
  },

  magnets: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'plusSquare',
      says: 'plus',
      faces: {
        '+': { icon: 'plusSquare', says: 'plus' },
        '-': { icon: 'minusSquare', says: 'minus' },
        Clear: { icon: 'emptyCell', says: 'clearSquare' },
      },
    }),
    6: act({
      key: ' ',
      icon: 'crossSquare',
      says: 'blankDomino',
      faces: {
        X: { icon: 'crossSquare', says: 'blankDomino' },
        '?': { icon: 'questionSquare', says: 'notBlankDomino' },
        Clear: { icon: 'emptyCell', says: 'clearSquare' },
      },
    }),
  },

  signpost: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'linkFrom',
      says: 'linkFrom',
      faces: {
        'From here': { icon: 'linkFrom', says: 'linkFrom' },
        'To here': { icon: 'done', says: 'endLink', on: true },
        [PENDING]: { icon: 'done', says: 'endLink', idle: true },
        [IDLING]: { icon: 'cancel', says: 'cancelLink', idle: true },
        Cancel: { icon: 'cancel', says: 'cancelLink', on: true },
      },
    }),
    6: act({
      key: ' ',
      icon: 'linkTo',
      says: 'linkTo',
      faces: {
        'To here': { icon: 'linkTo', says: 'linkTo' },
        'From here': { icon: 'done', says: 'endLink', on: true },
        [PENDING]: { icon: 'done', says: 'endLink', idle: true },
        [IDLING]: { icon: 'cancel', says: 'cancelLink', idle: true },
        Cancel: { icon: 'cancel', says: 'cancelLink', on: true },
      },
    }),
  },

  range: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'black', says: 'fillSquare', does: 'Fill', instead: 'Empty' }),
    6: act({ key: ' ', icon: 'dotSquare', says: 'dotSquare', does: 'Dot', instead: 'Empty' }),
  },

  // 6 号格两个租客轮流住:画着线时是「打叉」,收得回来时是「取消」,一次只有
  // 一个的 face 活着。
  pearl: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'drawLine',
      says: 'startLoop',
      faces: {
        Start: { icon: 'drawLine', says: 'startLoop' },
        Stop: { icon: 'done', says: 'endLoop', on: true },
        [UNTRODDEN]: { icon: 'done', says: 'endLoop', on: true, idle: true },
      },
    }),
    6: [
      arm({ key: '', icon: 'crossNext', says: 'crossNext', primes: { shift: true }, level: 1 }),
      act({
        key: ' ',
        icon: 'cancel',
        says: 'cancelLoop',
        level: 2,
        faces: { Cancel: { icon: 'cancel', says: 'cancelLoop', on: true } },
      }),
    ],
  },

  undead: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act(PENCIL),
  },

  unruly: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'black', says: 'blackSquare', does: 'Black', instead: 'Empty' }),
    6: act({ key: ' ', icon: 'white', says: 'whiteSquare', does: 'White', instead: 'Empty' }),
  },

  flood: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'floodFill',
      says: 'floodFill',
      faces: { Fill: { icon: 'floodFill', says: 'floodFill' } },
    }),
    6: act({
      key: ' ',
      icon: 'advance',
      says: 'advance',
      offCursor: true,
      level: 2,
      faces: { Advance: { icon: 'advance', says: 'advance' } },
    }),
  },

  tracks: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({
      key: 'Enter',
      icon: 'track',
      says: 'track',
      faces: {
        Track: { icon: 'track', says: 'track' },
        Clear: { icon: 'track', says: 'clearSquare', on: true },
      },
      replaces: 'Clear',
    }),
    6: act({
      key: ' ',
      icon: 'crossSquare',
      says: 'noTrack',
      faces: {
        X: { icon: 'crossSquare', says: 'noTrack' },
        Clear: { icon: 'crossSquare', says: 'clearSquare', on: true },
      },
      replaces: 'Clear',
    }),
  },

  // 走满格的那种画法里,边由光标自己压出来,两个功能键就没有活干。
  palisade: (_id, prefs) => ({
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    ...(preference(prefs, CURSOR_MODE) === 1
      ? {}
      : {
          4: act({ key: 'Enter', icon: 'edge', says: 'edge', holds: 'wall' }),
          6: act({ key: ' ', icon: 'noEdge', says: 'noEdge', holds: 'no' }),
        }),
  }),

  mosaic: {
    1: step('left'), 2: step('down'), 3: step('right'), 5: step('up'),
    4: act({ key: 'Enter', icon: 'black', says: 'blackSquare', does: 'Black', instead: 'Empty' }),
    6: act({ key: ' ', icon: 'white', says: 'whiteSquare', does: 'White', instead: 'Empty' }),
  },
}

// 表里没有 loopy:上游就没有光标。
export const offersArrows = (name: string) => name in PAD

const tenants = (table: Pad, slot: Slot): PadEntry[] => {
  const one = table[slot]
  return !one ? [] : Array.isArray(one) ? one : [one]
}

const tableOf = (name: string, id: string, prefs: readonly DialogControl[]): Pad => {
  const pad = PAD[name]
  return !pad ? {} : typeof pad === 'function' ? pad(id, prefs) : pad
}

const slotsOf = (table: Pad) =>
  (Object.keys(table).map(Number).sort((a, b) => a - b) as Slot[])

export function padKeys(
  name: string,
  id: string,
  prefs: readonly DialogControl[],
  ctx: PadContext,
): { rows: number; keys: PadButton[] } {
  const table = tableOf(name, id, prefs)
  const slots = slotsOf(table)
  if (slots.length === 0) return { rows: 0, keys: [] }

  // 行数按「注册了什么」算,不按「这一刻摆着什么」:键来来去去时块不该跟着蹦。
  const rows = Math.max(...slots.map(rowOf))

  const brushes = slots.filter((slot) => tenants(table, slot).some((one) => one.brush))
  const brushAt =
    ctx.brush !== null && brushes.includes(ctx.brush) ? ctx.brush : (brushes[0] ?? null)
  const asleep = silent(ctx.labels)
  const here = {
    ...ctx,
    asleep,
    painting: ctx.sweeping && !asleep,
    armed: (ctx.primed !== null && tenants(table, ctx.primed).find((one) => one.mod)?.mod) || null,
    brushAt,
    brushMod: (brushAt !== null && tenants(table, brushAt).find((one) => one.brush)?.brush) || null,
    picksBrush: brushes.length > 1,
  }

  const keys: PadButton[] = []
  for (const slot of slots) {
    const mine: PadHere = { ...here, slot }
    for (const one of tenants(table, slot)) {
      const face = one.face(mine)
      if (!face) continue
      keys.push({
        ...face,
        slot,
        row: rows + 1 - rowOf(slot),
        col: colOf(slot),
        gone: !one.moves && ctx.primed !== null && ctx.primed !== slot,
        press: () => one.press(mine),
      })
      break
    }
  }
  return { rows, keys }
}
