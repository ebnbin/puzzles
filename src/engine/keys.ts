// 重新实现上游 request_keys() 的结果(emcc.c 不调用它),按 game id 里的参数推;
// 认不出的 id 一律不显示键盘,而不是显示错的。逐游戏的判据和踩过的坑在 docs/keys.md,
// 改这里要同步改它。
// 这份推导和上游的真答案对不对得上,由 scripts/check-keys.mjs 去问引擎
// (midend_request_keys 已经导出);改 RULES、升级 vendor 之后跑它。
import type { IconName } from '../Icon'
import { COLOURS } from './map'
import type { Border, Stand } from './palisade'
import type { DialogControl, KeyLabel } from './types'

const MAX_SYMBOLS = 36

// 单行键盘里非符号键的最大个数,数出来的不是猜的:往任何 RULES 行加非符号键都要
// 同步加大它——keysFor 的长度守卫超限就整排不显示,只在最宽的合法棋盘上可见。
const MAX_EXTRAS = 6

// 字符与数值是两回事:unequal 超过 9 阶从 '0' 起标以保持一字宽,此时 '0' 键的
// value 是 1——value: i + 1 不是 off-by-one,键面显示前者、角标按后者计数。
function digits(count: number, startAtZero = false): KeyLabel[] {
  const first = startAtZero ? 0 : 1
  return Array.from({ length: count }, (_, i) => {
    const shown = first + i
    const button =
      shown <= 9 ? '0'.charCodeAt(0) + shown : 'a'.charCodeAt(0) + shown - 10
    return { kind: 'need', button, label: String.fromCharCode(button), value: i + 1 }
  })
}

const CLEAR: KeyLabel = { kind: 'need', button: 8, icon: 'clear' }

const MARKS: KeyLabel = { kind: 'aid', button: 'M'.charCodeAt(0), icon: 'marks', whose: 'upstream' }
const HINT: KeyLabel = { kind: 'aid', button: 'H'.charCodeAt(0), icon: 'hint', whose: 'upstream' }
const JUMBLE: KeyLabel = { kind: 'aid', button: 'J'.charCodeAt(0), icon: 'jumble', whose: 'upstream' }

const POSSIBLE: KeyLabel = { kind: 'aid', button: 0, action: 'possible', icon: 'possible', whose: 'ours' }
const SINGLE: KeyLabel = { kind: 'aid', button: 0, action: 'single', icon: 'single', whose: 'ours' }
const BLANK: KeyLabel = { kind: 'aid', button: 0, action: 'blank', icon: 'blank', whose: 'ours' }

function params(gameId: string): string {
  return gameId.split(':')[0]
}

function size(p: string): number | null {
  const m = p.match(/^(\d+)/)
  if (!m) return null
  const n = +m[1]
  return n >= 1 && n <= MAX_SYMBOLS ? n : null
}

// 故意按 answers 列表逐项匹配、不按名字(keyword 过不了边界):上游改名仍读对;
// 答案增删换序时宁可漏配(回落默认脸)也不把 value 对到换过序的表上。下面的
// flag 是被迫按 label 匹配的唯一例外——boolean 没有答案可匹配。
function preference(
  prefs: readonly DialogControl[],
  answers: readonly string[],
): number | null {
  for (const control of prefs)
    if (
      control.kind === 'choices' &&
      control.choices.length === answers.length &&
      control.choices.every((answer, i) => answer === answers[i])
    )
      return control.value
  return null
}

function flag(prefs: readonly DialogControl[], label: string): boolean {
  for (const control of prefs)
    if (control.kind === 'boolean' && control.label === label) return control.value
  return false
}

const MONSTERS = ['Pictures', 'Letters']

const UNDEAD = [
  { letter: 'G', icon: 'ghost' },
  { letter: 'V', icon: 'vampire' },
  { letter: 'Z', icon: 'zombie' },
] as const

const COL_FRAME = 1
const COL_1 = 6

const COL_MAP = 2

const LABELLED = 'Label colours with numbers'

const ERASE: KeyLabel = { ...CLEAR, kind: 'aim', behind: { step: 'ArrowLeft' } }

const HOLD: KeyLabel = { kind: 'aim', button: ' '.charCodeAt(0), icon: 'lock', whose: 'upstream' }

const SUBMIT: KeyLabel = {
  kind: 'aim',
  restarts: true,
  button: 13,
  icon: 'done',
  needs: 'Submit',
  whose: 'upstream',
}

const RULES: Record<
  string,
  (p: string, prefs: readonly DialogControl[]) => KeyLabel[] | null
> = {
  solo(p) {
    const m = p.match(/^(\d+)(?:x(\d+))?(.*)$/)
    if (!m) return null
    let c = +m[1]
    let r = m[2] === undefined ? c : +m[2]
    if (m[3].split('d')[0].includes('j')) {
      if (m[2] !== undefined) c *= r
      r = 1
    }
    const cr = c * r
    if (cr < 1 || cr > MAX_SYMBOLS) return null
    return [...digits(cr), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK]
  },
  keen(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK] : null
  },
  towers(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK] : null
  },
  unequal(p) {
    const order = size(p)
    if (!order) return null
    return [...digits(order, order > 9), CLEAR, MARKS, HINT, POSSIBLE, SINGLE, BLANK]
  },
  filling: () => [...digits(9), CLEAR],
  undead(_p, prefs) {
    const letters = preference(prefs, MONSTERS) === MONSTERS.indexOf('Letters')
    return [
      ...UNDEAD.map(({ letter, icon }): KeyLabel => ({
        kind: 'need',
        button: letter.charCodeAt(0),
        ...(letters ? { label: letter } : { icon }),
      })),
      CLEAR,
      MARKS,
      POSSIBLE,
      SINGLE,
      BLANK,
    ]
  },
  guess(p, prefs) {
    const m = p.match(/^c(\d+)p(\d+)g\d+/)
    if (!m) return null
    const n = +m[1]
    const pegs = +m[2]
    if (n < 2 || n > 10 || pegs < 1) return null
    const labelled = flag(prefs, LABELLED)
    return [
      HOLD,
      ...Array.from({ length: n }, (_, i): KeyLabel => {
        const button = '0'.charCodeAt(0) + ((i + 1) % 10)
        const fromTop = i <= (n - 1) / 2
        return {
          kind: 'aim',
          button,
          ...(labelled ? { label: String.fromCharCode(button) } : {}),
          slot: COL_1 + i,
          ink: COL_FRAME,
          value: i + 1,
          advances: pegs,
          aims: {
            home: fromTop ? 'ArrowUp' : 'ArrowDown',
            step: fromTop ? 'ArrowDown' : 'ArrowUp',
            span: n,
            at: fromTop ? i : n - 1 - i,
          },
        }
      }),
      ERASE,
      SUBMIT,
      HINT,
    ]
  },

  map: () =>
    Array.from({ length: COLOURS }, (_, i): KeyLabel => ({
      kind: 'aim',
      button: 0,
      slot: COL_MAP + i,
      paints: { colour: i },
      whose: 'ours',
    })),

  galaxies: () => [HINT],
  net: () => [JUMBLE],
  fifteen: () => [HINT],
  bridges: () => [HINT],
  range: () => [HINT],
  pearl: () => [HINT],
  dominosa(p) {
    const n = size(p)
    if (n === null) return null
    return digits(n + 1, true).map(({ value: _, ...key }): KeyLabel => ({
      ...key,
      kind: 'aid',
      whose: 'upstream',
    }))
  },
}

// 键盘长什么样要问偏好设置的游戏:PuzzleHost 见到这些名字,才会在偏好可能
// 动过之后回来重读一遍。
export const READS_PREFS = new Set(['undead', 'guess', 'palisade'])

const NO_ARROWS = new Set(['loopy'])

const PAD_ONLY = new Set(['guess'])

export const offersArrows = (name: string) => !NO_ARROWS.has(name) && !PAD_ONLY.has(name)

export const asMaybes = (keys: KeyLabel[]): KeyLabel[] =>
  keys.map((k) =>
    k.paints && k.paints.colour >= 0
      ? { ...k, dotted: true, paints: { ...k.paints, pencil: true } }
      : k,
  )

export const heads = (name: string) => name === 'guess'

const EIGHT_WAY = new Set(['inertia'])

export const movesEightWays = (name: string) => EIGHT_WAY.has(name)

export type CursorKey = {
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

export type CursorFace = {
  icon: IconName
  says: CursorWord
  on?: boolean
  idle?: boolean
}

export type CursorWord =
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
  | 'place'
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

export const shovesTiles = (name: string, labels: KeyLabels) =>
  name === 'sixteen' && (labels.enter === 'Unlock' || labels.space === 'Unlock')
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

export const silent = (labels: KeyLabels) => !labels.enter && !labels.space

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

export const inMenu = (
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

export const holding = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.instead &&
  !!cursor.does &&
  labels.enter !== cursor.does &&
  labels.space !== cursor.does &&
  (labels.enter === cursor.instead || labels.space === cursor.instead)

export const overwrites = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.twice &&
  !!cursor.does &&
  !holding(cursor, labels) &&
  labels.enter !== cursor.does &&
  labels.space !== cursor.does &&
  !!(labels.enter || labels.space)

export const clears = (cursor: CursorKey, labels: KeyLabels): string | null => {
  if (!cursor.replaces) return null
  const mineNow = cursor.key === 'Enter' ? labels.enter : labels.space
  const theirs = cursor.key === 'Enter' ? labels.space : labels.enter
  if (mineNow || theirs !== cursor.replaces) return null
  return cursor.key === 'Enter' ? ' ' : 'Enter'
}

export const laid = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.holds && labels.stand?.has === cursor.holds

export const buries = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.holds &&
  !!labels.stand?.live &&
  labels.stand.has !== null &&
  labels.stand.has !== 'none' &&
  labels.stand.has !== cursor.holds

export const wouldSend = (
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

export const faceOf = (
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

const PENCIL: CursorKey = { key: 'Enter', icon: 'pencil', says: 'pencil' }

const CURSOR_KEYS: Record<string, CursorKey[]> = {
  net: [
    { key: 'Enter', icon: 'rotate', says: 'rotateLeft' },
    { key: ' ', icon: 'lock', says: 'lock' },
  ],

  sixteen: [
    {
      key: 'Enter',
      icon: 'lockTile',
      says: 'carryTile',
      faces: {
        'Lock tile': { icon: 'lockTile', says: 'carryTile' },
        Unlock: { icon: 'lockTileOn', says: 'carryTile', on: true },
        Slide: { icon: 'primary', says: 'pushLine' },
      },
    },
    {
      key: ' ',
      icon: 'lockPlace',
      says: 'holdPlace',
      faces: {
        'Lock pos': { icon: 'lockPlace', says: 'holdPlace' },
        Unlock: { icon: 'lockPlaceOn', says: 'holdPlace', on: true },
        Back: { icon: 'secondary', says: 'pullLine' },
      },
    },
  ],

  twiddle: [
    { key: 'Enter', icon: 'turnLeft', says: 'turnLeft' },
    { key: ' ', icon: 'turnRight', says: 'turnRight' },
  ],

  rect: [
    {
      key: 'Enter',
      icon: 'mark',
      says: 'mark',
      faces: {
        Mark: { icon: 'mark', says: 'mark' },
        Done: { icon: 'done', says: 'done' },
        Cancel: { icon: 'cancel', says: 'cancel' },
        [PENDING]: { icon: 'done', says: 'done', idle: true },
      },
    },
    {
      key: ' ',
      icon: 'erase',
      says: 'erase',
      faces: {
        Erase: { icon: 'erase', says: 'erase' },
        Done: { icon: 'done', says: 'done' },
        Cancel: { icon: 'cancel', says: 'cancel' },
        [PENDING]: { icon: 'done', says: 'done', idle: true },
      },
    },
  ],

  netslide: [{ key: 'Enter', icon: 'primary', says: 'slide' }],

  pattern: [
    { key: 'Enter', icon: 'black', says: 'black', does: 'Black', lit: true, brush: { ctrl: true } },
    { key: ' ', icon: 'white', says: 'white', does: 'White', lit: true, brush: { shift: true } },
    {
      key: 'Enter',
      icon: 'grey',
      says: 'grey',
      does: 'Grey',
      lit: true,
      brush: { shift: true, ctrl: true },
    },
    { key: '', icon: 'sweep', says: 'sweep', sweeps: true },
  ],

  mines: [
    {
      key: 'Enter',
      icon: 'uncover',
      says: 'uncover',
      faces: {
        Uncover: { icon: 'uncover', says: 'uncover' },
        Clear: { icon: 'chord', says: 'chord' },
      },
    },
    {
      key: ' ',
      icon: 'flag',
      says: 'flag',
      faces: {
        Mark: { icon: 'flag', says: 'flag' },
        Unmark: { icon: 'flag', says: 'unflag' },
      },
    },
  ],

  samegame: [
    {
      key: 'Enter',
      icon: 'select',
      says: 'select',
      faces: {
        Select: { icon: 'select', says: 'select' },
        Remove: { icon: 'done', says: 'remove', on: true },
      },
    },
    { key: ' ', icon: 'cancel', says: 'unselect', does: 'Unselect', level: 2 },
  ],

  flip: [{ key: 'Enter', icon: 'flip', says: 'flip' }],

  pegs: [
    {
      key: 'Enter',
      icon: 'jump',
      says: 'jump',
      faces: {
        Select: { icon: 'jump', says: 'jump' },
        Cancel: { icon: 'cancel', says: 'unjump', on: true },
      },
    },
  ],

  dominosa: [
    {
      key: 'Enter',
      icon: 'domino',
      says: 'domino',
      faces: {
        Place: { icon: 'domino', says: 'domino' },
        Remove: { icon: 'dominoOn', says: 'undomino', on: true },
      },
    },
    {
      key: ' ',
      icon: 'line',
      says: 'line',
      faces: {
        Line: { icon: 'line', says: 'line' },
        Remove: { icon: 'lineOn', says: 'unline', on: true },
      },
    },
  ],

  untangle: [
    { key: 'Enter', icon: 'vertex', says: 'drag' },
    { key: ' ', icon: 'cycle', says: 'cycle' },
  ],

  blackbox: [
    {
      key: 'Enter',
      icon: 'ball',
      says: 'ball',
      faces: {
        Fire: { icon: 'laser', says: 'fire' },
        Ball: { icon: 'ball', says: 'ball' },
        Clear: { icon: 'ballOn', says: 'unball', on: true },
        Check: { icon: 'done', says: 'check' },
      },
    },
    {
      key: ' ',
      icon: 'lock',
      says: 'lockCell',
      faces: {
        Lock: { icon: 'lock', says: 'lockCell' },
        Unlock: { icon: 'unlock', says: 'unlockCell', on: true },
      },
    },
  ],

  slant: [
    { key: '\\', icon: 'backslash', says: 'backslash' },
    { key: '/', icon: 'slash', says: 'slash' },
    { key: '\b', icon: 'bareSquare', says: 'noLine' },
  ],

  lightup: [
    {
      key: 'Enter',
      icon: 'lamp',
      says: 'light',
      faces: {
        Light: { icon: 'lamp', says: 'light' },
        Clear: { icon: 'lamp', says: 'unlight', on: true },
      },
      replaces: 'Clear',
    },
    {
      key: ' ',
      icon: 'dotSquare',
      says: 'cannot',
      faces: {
        Mark: { icon: 'dotSquare', says: 'cannot' },
        Clear: { icon: 'dotSquare', says: 'uncannot', on: true },
      },
      replaces: 'Clear',
    },
  ],

  tents: [
    { key: 'T', icon: 'tent', says: 'tent', switches: 'B' },
    { key: 'N', icon: 'grass', says: 'grass', switches: 'B' },
  ],

  singles: [
    { key: 'Enter', icon: 'black', says: 'blackSquare', does: 'Black', instead: 'Restore', twice: true },
    { key: ' ', icon: 'circleSquare', says: 'circle', does: 'Circle', instead: 'Remove', twice: true },
  ],

  unruly: [
    { key: 'Enter', icon: 'black', says: 'blackSquare', does: 'Black', instead: 'Empty' },
    { key: ' ', icon: 'white', says: 'whiteSquare', does: 'White', instead: 'Empty' },
  ],

  mosaic: [
    { key: 'Enter', icon: 'black', says: 'blackSquare', does: 'Black', instead: 'Empty' },
    { key: ' ', icon: 'white', says: 'whiteSquare', does: 'White', instead: 'Empty' },
  ],

  range: [
    { key: 'Enter', icon: 'black', says: 'fillSquare', does: 'Fill', instead: 'Empty' },
    { key: ' ', icon: 'dotSquare', says: 'dotSquare', does: 'Dot', instead: 'Empty' },
  ],

  magnets: [
    {
      key: 'Enter',
      icon: 'plusSquare',
      says: 'plus',
      faces: {
        '+': { icon: 'plusSquare', says: 'plus' },
        '-': { icon: 'minusSquare', says: 'minus' },
        Clear: { icon: 'emptyCell', says: 'clearSquare' },
      },
    },
    {
      key: ' ',
      icon: 'crossSquare',
      says: 'blankDomino',
      faces: {
        X: { icon: 'crossSquare', says: 'blankDomino' },
        '?': { icon: 'questionSquare', says: 'notBlankDomino' },
        Clear: { icon: 'emptyCell', says: 'clearSquare' },
      },
    },
  ],

  tracks: [
    {
      key: 'Enter',
      icon: 'track',
      says: 'track',
      faces: {
        Track: { icon: 'track', says: 'track' },
        Clear: { icon: 'track', says: 'clearSquare', on: true },
      },
      replaces: 'Clear',
    },
    {
      key: ' ',
      icon: 'crossSquare',
      says: 'noTrack',
      faces: {
        X: { icon: 'crossSquare', says: 'noTrack' },
        Clear: { icon: 'crossSquare', says: 'clearSquare', on: true },
      },
      replaces: 'Clear',
    },
  ],

  flood: [
    {
      key: 'Enter',
      icon: 'floodFill',
      says: 'floodFill',
      faces: { Fill: { icon: 'floodFill', says: 'floodFill' } },
    },
    {
      key: ' ',
      icon: 'advance',
      says: 'advance',
      offCursor: true,
      level: 2,
      faces: { Advance: { icon: 'advance', says: 'advance' } },
    },
  ],

  palisade: [
    { key: 'Enter', icon: 'edge', says: 'edge', holds: 'wall' },
    { key: ' ', icon: 'noEdge', says: 'noEdge', holds: 'no' },
  ],

  bridges: [
    { key: ' ', icon: 'islandDone', says: 'islandDone' },
    { key: '', icon: 'bridge', says: 'buildBridge', primes: { ctrl: true } },
    { key: '', icon: 'noBridge', says: 'noBridge', primes: { shift: true } },
  ],

  signpost: [
    {
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
    },
    {
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
    },
  ],

  pearl: [
    {
      key: 'Enter',
      icon: 'drawLine',
      says: 'startLoop',
      faces: {
        Start: { icon: 'drawLine', says: 'startLoop' },
        Stop: { icon: 'done', says: 'endLoop', on: true },
        [UNTRODDEN]: { icon: 'done', says: 'endLoop', on: true, idle: true },
      },
    },
    { key: '', icon: 'crossNext', says: 'crossNext', primes: { shift: true }, level: 1 },
    {
      key: ' ',
      icon: 'cancel',
      says: 'cancelLoop',
      level: 2,
      faces: { Cancel: { icon: 'cancel', says: 'cancelLoop', on: true } },
    },
  ],

  galaxies: [
    {
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
    },
  ],

  inertia: [{ key: 'Enter', icon: 'advance', says: 'advance', level: 2 }],

  map: [
    { key: '', icon: 'stipple', says: 'maybeMode', arms: true },
    { key: '', icon: 'clear', says: 'clearRegion', paints: { colour: -1 } },
  ],


  solo: [PENCIL],
  unequal: [PENCIL],
  keen: [PENCIL],
  towers: [PENCIL],
  undead: [PENCIL],
}

export const HOLD_BUTTON: Record<string, number> = {
  net: 1,
}

const CURSOR_MODE = ['Half-grid', 'Full-grid']

export function cursorKeys(
  name: string,
  prefs: readonly DialogControl[] = [],
): CursorKey[] {
  if (name === 'palisade' && preference(prefs, CURSOR_MODE) === 1) return []
  return CURSOR_KEYS[name] ?? []
}

export function keysFor(
  name: string,
  gameId: string,
  prefs: readonly DialogControl[] = [],
): KeyLabel[] {
  const rule = RULES[name]
  if (!rule) return []
  const keys = rule(params(gameId), prefs)
  if (!keys || keys.length < 1 || keys.length > MAX_SYMBOLS + MAX_EXTRAS) return []
  return keys
}
