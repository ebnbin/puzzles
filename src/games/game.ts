// 统一游戏接口:四十个游戏各默认导出一份 Game,index.ts 的注册表是全项目唯一的
// 「游戏名 → 行为」映射。规矩三条,违者即是设计回退:
//   1. 接口和宿主里不出现任何游戏名;能力用通用形态表达,特殊游戏只是取值不同。
//   2. 一个游戏 = 一个文件。util 的判据是「看不见游戏」——参数与实现里没有游戏名,
//      也没有任何一个游戏的参数/存档/走子语法。
//   3. 逐游戏事实(光标、标签、键)以 vendor/ 的 C 源码为准,docs/inputs.md 是索引。
import type { IconName, ImageName } from '../ui/Icon'
import type { Strings } from '../i18n'
import type { Dark } from '../engine/palette'
import type { Drawn } from '../engine/renderer'
import type { DialogControl, Preset } from '../engine/types'

export type GameName =
  | 'net' | 'cube' | 'fifteen' | 'sixteen' | 'twiddle' | 'rect' | 'netslide'
  | 'pattern' | 'solo' | 'mines' | 'samegame' | 'flip' | 'guess' | 'pegs'
  | 'dominosa' | 'untangle' | 'blackbox' | 'slant' | 'lightup' | 'map' | 'loopy'
  | 'inertia' | 'tents' | 'bridges' | 'unequal' | 'galaxies' | 'filling' | 'keen'
  | 'towers' | 'singles' | 'magnets' | 'signpost' | 'range' | 'pearl' | 'undead'
  | 'unruly' | 'flood' | 'tracks' | 'palisade' | 'mosaic'

export type Game<F = null> = {
  id: GameName

  upstream: Upstream
  touch: Touch
  dark: Dark
  pages: Pages
  types: Types
  prefs: Prefs

  // 上方键区。null = 这一局的参数认不出,整排不画;[] = 这个游戏没有上方键区。
  keypad(deal: Deal): Key<F>[] | null
  // 方向键块。null = 无键盘玩法。
  arrows: Arrows<F> | null
  observe: Observe<F>
}

// ---------------------------------------------------------------- 申报组

export type Upstream = {
  // 上游是否实现 current_key_label;注册 NULL 的游戏标签恒为空串。
  labels: 'live' | 'none'
  // 两个确认键可能同时报出的词。midend 本给两词,但已发布的 wasm 胶水
  // (public/engine/**,生成物)在两词相同时把 lsk 抹成空串;宿主在边界按这份
  // 申报复原,接口内部只见双词。下次重生成引擎改为原样双传后,这个字段删除。
  echoes?: readonly string[]
  cursor:
    | { kind: 'none' } // 无键盘光标,方向键即走子
    | { kind: 'reported' } // 标签自含光标可见性
    // 标签盲于可见性,宿主镜像一位:这些键唤醒;鼠标按下熄灭;发牌重置。
    | { kind: 'mirrored'; wakes: readonly string[] }
}

// 长按折算的鼠标键。上游触摸长按 = 右键;个别游戏的右键行为在无 MOD_STYLUS 的
// 前端到不了,改借等价的中键。
export type Touch = { hold: 'right' | 'middle' }

// 深色申报的类型与翻译引擎同住 engine/palette.ts,这里转口:申报是引擎的
// 参数语言,类型跟着机器走,依赖只许从 games 指向 engine。
export type { Dark }

export type Pages = { manual: string; help: string; howto: string }

export type Types = { menu(presets: readonly Preset[]): readonly Preset[] }
export type Prefs = {
  // 只许换序/隐藏,必须保持元素身份:对话框提交时 C 侧闭包从原对象读回 value。
  // 拿到的已经是宿主撤掉「键区已有按钮」那几条之后的剩余(见 Key.fronts)。
  panel(controls: readonly DialogControl[]): readonly DialogControl[]
  // 棋盘上的一次输入就能翻掉自己偏好的游戏(guess 的 l、map 的 l、undead 的 a、
  // bridges 的 g、singles 点棋盘外沿),宿主在每次按键和每次手势之后重读一遍。
  // 偏好面板那条路不看这一位(提交完自己会 setPrefs);开局那一次读也不看,
  // view.prefs 对谁都是真的。写多了不是保险,是每次输入都白借一次偏好 box。
  volatile: boolean
  // 换掉上游偏好的默认值:按 kw 申报,开局垫在存档下面(用户存过的那几条赢)。
  // 只给 kw 和值,行由 createPuzzle 拼——有一行解析不了会让整份偏好静默作废。
  defaults?: Readonly<Record<string, string>>
}

// ---------------------------------------------------------------- 键面

export type Art =
  | { text: string }
  | { glyph: IconName }
  | { image: ImageName } // /art/<image>-<theme>.png
  // 引擎调色板色钉;fill/edge 是槽号,经主题翻译后取色。
  | { swatch: { fill: number; edge?: number; dotted?: boolean; label?: string } }

export type Face = {
  art: Art
  // 读法与长按提示,已按当前语言解出(face 函数从 view.words 取词)。
  // 上方键区的键可缺省:宿主按 art 形态派生说法。
  says?: string
  on?: boolean // 激活态
  ring?: boolean // 多笔刷并存时的选中环
  held?: boolean // aria-pressed
  dead?: boolean // 缺省 = 可按
  tip?: boolean // 长按是否给提示(方向键要连按,不给)
}

// ---------------------------------------------------------------- 上方键区

export type Deal = { params: string; prefs: readonly DialogControl[] }

export type Key<F> = {
  group: 'entry' | 'pick' | 'assist' | 'prefer'
  face: Face | ((view: View<F>) => Face)
  // 契约测试用:这个键等价于上游 request_keys 的哪个按钮码(check-keys 对账)。
  button?: number
  // 这个键顶的是 view.prefs 里第几条。宿主据此把那一行从偏好面板里撤掉——同一个
  // 开关不在两处各占一行。只有 preferKeys 填这一格。
  fronts?: number
  press(board: Board<F>): void
}

// ---------------------------------------------------------------- 方向键块

// 格子号从下往上、每行从左到右,和屏幕的自上而下反着:
//   7 8 9
//   4 5 6
//   1 2 3
export type Slot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type Arrows<F> = {
  keys: readonly ArrowKey<F>[]
  // 双层菜单的判层;缺省恒 1。'both' = 标签词汇认不出,机器退让、两层都摆。
  layer?(view: View<F>): 1 | 2 | 'both'
}

export type ArrowKey<F> = {
  id: string // 游戏内唯一;lit/armed 按它记
  slot: Slot // 同格多键 = 轮替租客,face 互斥非 null
  layer?: 1 | 2 // 只在该层上场;缺省两层都在
  moves?: true // 方向键:有键上膛时唯一留场的类别
  face(view: View<F>): Face | null // null = 这一刻不上场
  press(board: Board<F>): void
}

export type Mods = { shift?: true; ctrl?: true }

// ---------------------------------------------------------------- 视野与棋盘

// midend 每步对两个确认键各报一词,原样双传、不抹空(呈现层自己比较两词)。
export type Labels = { enter: string; space: string }

export type Words = Strings['puzzle'] & { keys: Strings['keys'] }

export type Armed = { id: string; mods: Mods }

export type View<F> = {
  labels: Labels
  facts: F
  // mirrored 用镜像位;其余恒 true——'none' 的游戏没有键读它,'reported' 的
  // 可见性已在标签里,读这一位的只有镜像光标的键。
  cursor: boolean
  lit: ReadonlySet<string> // 亮着的粘滞键
  armed: Armed | null
  prefs: readonly DialogControl[] // 当前偏好(键盘形状要看偏好的游戏读这份)
  words: Words
}

// 裸串是常态('Enter'、' '、'M');pad = 小键盘方位(斜向要报 NUMPAD location)。
export type Stroke = string | { key: string; pad?: true; shift?: true; ctrl?: true }

export type Board<F> = {
  view(): View<F> // send 之后同步刷新,连发中间的判断可靠
  send(s: Stroke): void
  gate<T>(run: (g: Gate) => T): T
  // 借一次上游的偏好对话框:就地改活对象再提交,返回 false = 什么都没动、撤回。
  // 控件只能按英文 label 认——emcc 只把 name 交给 JS,kw 到不了这一侧(emcc.c:628)。
  prefer(use: (prefs: DialogControl[]) => boolean): void
  undo(): void
  arm(armed: Armed | null): void
  latch(id: string, on: boolean): void
}

// 存档门:midend_deserialise 把走子直交 execute_move,不经 interpret_move。
// 键说不出的动作(涂某个颜色、整盘铺标记)从这里写;探测(改盘 → 读 → 复原)
// 也在这里编排。门内必须同步做完,不许跨帧。redo 在门内是补闪的一半,
// 见 util/save.ts 的 loadExtended。
export type Gate = {
  read(): string
  load(text: string): void
  send(s: Stroke): void
  redo(): void
  // 载入一份存档并录下这一载的整卷画面(线索探测用);调用方负责随后 load 回原盘。
  replay(text: string): readonly Drawn[]
}

// ---------------------------------------------------------------- 观察

export type Observe<F> = {
  init: F
  saves?: true // 每步之后要一份存档({ moved })
  frames?: true // 要录像帧({ frame })
  next(facts: F, saw: Saw): F
}

export type Saw =
  | { deal: string; gate: Gate } // 新一局(读档/换参数同);gate 仅此拍有效
  | { moved: string } // 每次输入后的存档(声明 saves 才收)
  | { sent: Stroke; before: Labels } // 这一侧发出的每个键,和发出前一刻的标签
  | { spoke: Labels } // midend 每次报出的标签
  | { frame: readonly Drawn[] } // 一帧录像(声明 frames 才收)

export const still: Observe<null> = { init: null, next: () => null }

export const keyOf = (s: Stroke): string => (typeof s === 'string' ? s : s.key)

export const plain = (s: Stroke): boolean =>
  typeof s === 'string' || (!s.shift && !s.ctrl)
