// Map:四色染图。上游 map.c。
// 上游没有任何键能说出一个颜色,四个颜色键走存档门写走子(<颜色>:<区域>)。
// 区域编号问引擎,不算几何——重写 map.c 几何的方案试过,错在对角线格子依赖
// SHA-1 洗牌的访问顺序,一局约 1% 的格子错、错得很安静。现在先把每个区域刷上
// 颜色再让引擎自己说(全涂色让「沉默」只剩「这是线索」一个意思),代价每按一次
// 70–120ms。改这里跑 scripts/check-map.mjs 和 check-clues.mjs。
// 光标坐标是全 app 唯一一份坐标镜像:调色板要往光标那格落色。敢记是因为
// midend_deserialise 每次重建 game_ui、光标回原点,每按一次调色板就重新对齐。
// 线索表从「发牌那一刻的录像」读出(readTape):光标站上线索时颜色键置灰。
import type { Board, Game, Gate, Key, View } from './game'
import { keyOf, plain } from './game'
import { fill } from '../i18n/fill'
import { samePages, verbatim } from './util/declare'
import type { Drawn } from '../engine/renderer'
import type { Spot } from './util/mirror'
import { stepCursor } from './util/mirror'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { done, extend, fields, find, line, loadExtended } from './util/save'
import { cross } from './util/pad'

export const COLOURS = 4

export type Paint = { colour: number; pencil?: boolean }

// 引擎调色板里按名字认下来的槽号:四个区域色从 2 号起。升级 vendor 后重新核对。
const COL_MAP = 2

export function mapSize(params: string) {
  const m = /^(\d+)x(\d+)n(\d+)/.exec(params)
  if (!m) return null
  const [w, h, n] = [+m[1], +m[2], +m[3]]
  return w > 0 && h > 0 && n > 0 && n <= w * h ? { w, h, n } : null
}

function clues(n: number, desc: string) {
  const list = desc.split(',')[1]
  if (list === undefined) return null
  const colour = new Array<number>(n).fill(-1)
  const given = new Array<boolean>(n).fill(false)
  let r = 0
  for (const ch of list) {
    if (ch >= '0' && ch < String.fromCharCode(48 + COLOURS)) {
      if (r >= n) return null
      colour[r] = +ch
      given[r] = true
      r++
    } else if (ch >= 'a' && ch <= 'z') r += ch.charCodeAt(0) - 96
    else return null
  }
  return r === n ? { colour, given } : null
}

function replay(
  moves: { key: string; value: string }[],
  start: ReturnType<typeof clues>,
  desc: string,
) {
  if (!start) return null
  const colour = [...start.colour]
  const pencil = new Array<number>(colour.length).fill(0)
  for (const move of moves) {
    if (move.key === 'RESTART') {
      if (move.value !== desc) return null
      for (let r = 0; r < colour.length; r++) { colour[r] = start.colour[r]; pencil[r] = 0 }
      continue
    }
    if (move.key === 'SOLVE') return null
    for (const step of move.value.split(';')) {
      const m = /^(p?)(C|[0-9]):(\d+)$/.exec(step)
      if (!m) return null
      const r = +m[3]
      const c = m[2] === 'C' ? -1 : +m[2]
      if (r >= colour.length || c >= COLOURS) return null
      if (m[1]) {
        if (c < 0) pencil[r] = 0
        else pencil[r] ^= 1 << c
      } else {
        colour[r] = c
        pencil[r] = 0
      }
    }
  }
  return { colour, pencil }
}

const wording = (paint: Paint, at: { colour: number; pencil: number }, r: number) => {
  if (paint.pencil) {
    if (at.colour >= 0 || paint.colour < 0) return null
    return `p${paint.colour}:${r}`
  }
  if (at.colour === paint.colour && (paint.colour >= 0 || at.pencil === 0)) return null
  return `${paint.colour < 0 ? 'C' : paint.colour}:${r}`
}

// 本函数必须在一次同步调用内做完,中间不能插 await 或分帧:探针盘(全涂色)和
// 发牌盘都真的画上了 canvas,只靠浏览器来不及合成才不可见。
export function paintRegion(gate: Gate, at: Spot, paint: Paint): void {
  const orig = gate.read()
  const lines = fields(orig)
  if (!lines) return
  const params = find(lines, 'PARAMS')
  const desc = find(lines, 'DESC')
  const kept = done(lines)
  if (params === undefined || desc === undefined || !kept) return
  const grid = mapSize(params)
  if (!grid) return
  const start = clues(grid.n, desc)
  const stood = replay(kept, start, desc)
  if (!start || !stood) return

  const walk = (to: Spot) => {
    // 这一记不多余:每次 loadGame 后 game_ui 重建、光标藏在原点没醒;map 的方向
    // 键总是「移动 + 唤醒」,而 0 的左边没有格,ArrowLeft 是唯一原地唤醒的按法。
    // 删掉它,to=(0,0) 时探针第一记 Enter 会被吃掉去唤醒,调色板静默哑掉。
    gate.send('ArrowLeft')
    for (let i = 0; i < to.x; i++) gate.send('ArrowRight')
    for (let i = 0; i < to.y; i++) gate.send('ArrowDown')
  }
  const restore = () => { gate.load(orig); walk(at) }

  let region: number | null = null
  const paint0 = Array.from({ length: grid.n }, (_, r) => `0:${r}`).join(';')
  gate.load(extend(lines, kept, [paint0]) ?? orig)
  walk(at)
  gate.send('Enter')
  gate.send('Enter')
  const played = done(fields(gate.read()) ?? [])
  if (played && played.length > kept.length + 1) {
    const m = /^C:(\d+)$/.exec(played[played.length - 1].value)
    if (m) region = +m[1]
  }
  // given 检查不是冗余:存档门绕过 interpret_move,execute_move 对涂色走子只查
  // 区域号在范围内(map.c:2638),线索区域照样被覆写;拒绝线索的守卫在
  // interpret_move 那侧(map.c:2588),不在这条路径上,「不是线索」必须由这里证明。
  if (region === null || region >= grid.n || start.given[region]) return restore()

  const move = wording(paint, { colour: stood.colour[region], pencil: stood.pencil[region] }, region)
  if (!move) return restore()
  const next = extend(lines, kept, [move])
  if (!next) return restore()
  loadExtended(gate, next)
  walk(at)
}

const COL_BACKGROUND = 0

export type Clues = {
  w: number
  h: number
  top: Uint8Array
  bottom: Uint8Array
  apexRight: Uint8Array
}

export function readTape(tape: readonly Drawn[], grid: { w: number; h: number }): Clues | null {
  const { w, h } = grid
  const squares = new Map<number, Drawn & { kind: 'rect' }>()
  const sizes = new Map<number, number>()
  for (const d of tape)
    if (d.kind === 'rect' && d.w === d.h && d.w > 2)
      sizes.set(d.w, (sizes.get(d.w) ?? 0) + 1)
  let tile = 0
  for (const [size, count] of sizes) if (count >= w * h && (!tile || size < tile)) tile = size
  if (!tile) return null

  let ox = Infinity
  let oy = Infinity
  for (const d of tape)
    if (d.kind === 'rect' && d.w === tile && d.h === tile) {
      ox = Math.min(ox, d.x)
      oy = Math.min(oy, d.y)
    }
  const cell = (x: number, y: number) => {
    const cx = Math.round((x - ox) / tile)
    const cy = Math.round((y - oy) / tile)
    return cx >= 0 && cx < w && cy >= 0 && cy < h ? cy * w + cx : -1
  }

  for (const d of tape)
    if (d.kind === 'rect' && d.w === tile && d.h === tile) {
      const i = cell(d.x, d.y)
      if (i >= 0) squares.set(i, d)
    }
  if (squares.size !== w * h) return null

  const top = new Uint8Array(w * h)
  const bottom = new Uint8Array(w * h)
  const apexRight = new Uint8Array(w * h)
  for (const [i, d] of squares) {
    const clue = d.colour !== COL_BACKGROUND ? 1 : 0
    top[i] = clue
    bottom[i] = clue
  }
  for (const d of tape) {
    if (d.kind !== 'poly' || d.points.length !== 6) continue
    const xs = [d.points[0], d.points[2], d.points[4]]
    const ys = [d.points[1], d.points[3], d.points[5]]
    const i = cell(
      (Math.min(...xs) + Math.max(...xs)) / 2 - tile / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2 - tile / 2,
    )
    if (i < 0) continue
    bottom[i] = d.colour !== COL_BACKGROUND ? 1 : 0
    apexRight[i] = d.points[2] > (Math.min(...xs) + Math.max(...xs)) / 2 ? 1 : 0
  }
  return { w, h, top, bottom, apexRight }
}

export function clueAt(cluesRead: Clues, at: Spot, dir: string): boolean {
  const i = at.y * cluesRead.w + at.x
  if (i < 0 || i >= cluesRead.top.length) return false
  const quadrant =
    dir === 'ArrowUp' ? 'TE' :
    dir === 'ArrowDown' ? 'BE' :
    dir === 'ArrowLeft' ? 'LE' :
    dir === 'ArrowRight' ? 'RE' : 'BE'
  const withTop =
    quadrant === 'TE' ? true :
    quadrant === 'BE' ? false :
    quadrant === 'LE' ? cluesRead.apexRight[i] === 1 : cluesRead.apexRight[i] === 0
  return (withTop ? cluesRead.top[i] : cluesRead.bottom[i]) === 1
}

type Facts = {
  grid: { w: number; h: number; n: number } | null
  spot: Spot
  clues: Clues | null
  onClue: boolean
}

const HOME: Facts = { grid: null, spot: { x: 0, y: 0 }, clues: null, onClue: false }

const paintPress =
  (colour: number) =>
  (board: Board<Facts>): void => {
    const view = board.view()
    if (!view.cursor) return
    const pencil = view.lit.has('maybe') && colour >= 0 ? true : undefined
    board.gate((g) => paintRegion(g, view.facts.spot, { colour, pencil }))
  }

const swatchKey = (i: number): Key<Facts> => ({
  group: 'pick',
  face: (view: View<Facts>) => {
    const maybe = view.lit.has('maybe')
    return {
      art: { swatch: { fill: COL_MAP + i, dotted: maybe || undefined } },
      says: fill(maybe ? view.words.keys.maybeRegion : view.words.keys.fillRegion, { n: i + 1 }),
      dead: !view.cursor || view.facts.onClue,
    }
  },
  button: 0,
  press: paintPress(i),
})

// 三条偏好里只摆这一条:另外两条(通关闪法、候选点大小)是观感,不是解题信息。
const NUMBERED: Prefer = { label: 'Number regions', glyph: 'numberRegion' }

const map: Game<Facts> = {
  id: 'map',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    },
  },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('map'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => [
    ...Array.from({ length: COLOURS }, (_, i) => swatchKey(i)),
    ...preferKeys<Facts>(prefs, [NUMBERED]),
  ],
  arrows: {
    keys: [
      ...cross<Facts>(),
      {
        id: 'maybe',
        slot: 4,
        face: (view) => {
          const on = view.lit.has('maybe') && view.cursor
          return {
            art: { glyph: 'stipple' },
            says: view.words.cursor.maybeMode,
            tip: true,
            on,
            held: on,
            dead: !view.cursor,
          }
        },
        press: (board) => board.latch('maybe', !board.view().lit.has('maybe')),
      },
      {
        id: 'clear',
        slot: 6,
        face: (view) => ({
          art: { glyph: 'clear' },
          says: view.words.cursor.clearRegion,
          tip: true,
          dead: !view.cursor || view.facts.onClue,
        }),
        press: paintPress(-1),
      },
    ],
  },
  observe: {
    init: HOME,
    next: (facts, saw) => {
      if ('deal' in saw) {
        const grid = mapSize(saw.deal.split(':')[0])
        if (!grid) return HOME
        // 线索表从发牌那一刻的录像读:把 STATEPOS 拨回 1 载入一次,录像里
        // 「有色的格」就是线索,读完把原盘放回去。
        const save = saw.gate.read()
        const lines = fields(save)
        let read: Clues | null = null
        if (lines) {
          const dealt = lines
            .map((f) => line(f.key, f.key === 'STATEPOS' ? '1' : f.value))
            .join('')
          const tape = saw.gate.replay(dealt)
          saw.gate.load(save)
          read = readTape(tape, grid)
        }
        return { grid, spot: { x: 0, y: 0 }, clues: read, onClue: false }
      }
      if ('sent' in saw && plain(saw.sent) && facts.grid) {
        const key = keyOf(saw.sent)
        const spot = stepCursor(facts.spot, key, facts.grid)
        return {
          ...facts,
          spot,
          onClue: facts.clues ? clueAt(facts.clues, spot, key) : false,
        }
      }
      return facts
    },
  },
}

export default map
