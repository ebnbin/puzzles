// Solo:数独(含 Killer、Jigsaw、X 变体)。上游 solo.c。
// 数字键盘按参数推(重新实现 request_keys 的结果,emcc.c 不调用它),认不出的
// 参数一律不显示键盘;对不对得上由 scripts/check-keys.mjs 去问引擎。
import type { Game } from './game'
import { still } from './game'
import { keepPencil, samePages, verbatim } from './util/declare'
import { PENCIL_HIGHLIGHT, clearKey, digitKeys, marksKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { choice, int, range } from './util/params'

function params(text: string): { c: number; r: number } | null {
  const first = /^(\d+)/.exec(text)
  if (!first) return null
  let c = Number(first[1])
  let r = c
  let seenR = false
  let at = first[1].length

  if (text[at] === 'x') {
    const second = /^(\d+)/.exec(text.slice(at + 1))
    if (!second) return null
    r = Number(second[1])
    seenR = true
    at += 1 + second[1].length
  }

  while (at < text.length) {
    const ch = text[at]
    if (ch === 'j') {
      at += 1
      if (seenR) c *= r
      r = 1
    } else if (ch === 'x' || ch === 'k') {
      at += 1
    } else if (ch === 'r' || ch === 'm' || ch === 'a') {
      at += 1
      if (ch === 'm' && text[at] === 'd') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    } else if (ch === 'd') {
      at += 1
      if (!'tbiaeu'.includes(text[at])) return null
      at += 1
    } else {
      return null
    }
  }

  const cr = c * r
  if (!Number.isInteger(cr) || cr < 1 || cr > 36) return null
  return { c, r }
}

// 上游 solo.c:514-527:阶数 c·r ≤ 31,Killer 时 ≤ 9,X 时 ≥ 4,列数 ≥ 2。
// 行数 = 1 与 Jigsaw 是同一件事:勾选框只是 r == 1 的显示(solo.c:471),生成器也只认
// r == 1(solo.c:3698)。所以行数不给 1 这一档——勾着 Jigsaw 时钉死 1、整行不画(这时
// 列数就是阶数),勾掉时从 2 起。勾选与取消都不动列数,只在它落到新表外时才被吸走。
const killer = (r: Read) => r.flag('Killer (digit sums)')
const jigsaw = (r: Read) => r.flag('Jigsaw (irregularly shaped sub-blocks)')

// 阶数上限。非 Jigsaw 按难度分档:验收要求难度「恰好等于」所选档(solo.c:3864 的
// dlev.diff == dlev.maxdiff),档越高每次试解越贵、验收越容易不过;Advanced 加的集合消元
// 要枚举一个区域里数字的全部子集,阶数每加一翻一倍。Jigsaw 不分难度,统一 12:它的耗时由
// 「切法重试」主导(一次填盘失败烧掉 n⁴ 步、约等于同阶删提示全过程的十二倍),难度只作用在
// 删提示那一小部分,13 阶起无论哪一档都是分钟级。31 只是上游的天花板,Killer 之外不另加限制。
const SYMM_NONE = 0
const BY_DIFF = [30, 30, 25, 25, 16, 16]
const JIGSAW_TOP = 12
const top = (r: Read) =>
  Math.min(jigsaw(r) ? JIGSAW_TOP : (BY_DIFF[r.pick('Difficulty')] ?? 30), killer(r) ? 9 : 31)
const half = (r: Read) => Math.floor(top(r) / 2)

// 2×2(非 Jigsaw 唯一的 4 阶形态)只在无对称和 2 向旋转下给。删提示是按对称轨道整组删的:
// 轨道 4 格或 8 格时一刀太大,轨道 2 格但两格同行(左右镜像)时那一行的排除力一下子掉两成、
// 块内消元推不动,两种都很早就删不动,终局留着八格以上提示,题面写出来 17 个字符起,而
// encode_puzzle_desc 的预算正好 17(solo.c:3370、3414),断言会停。轨道 1 格或两格不共行不共列的
// 那三档(无对称、2 向旋转、2 向对角镜像)能删到四到六格、13 个字符,穷举验过是安全的;
// 2 向对角镜像一并去掉是从简——上游预设清一色 2 向旋转。
const SAFE_TINY = [0, 1]
const tiny = (r: Read) => SAFE_TINY.includes(r.pick('Symmetry'))

// 列数与行数是对等的两个数(对调只是把棋盘转置),约束是乘积,所以走互推:两根滑块的档位
// 都是「配得上某个合法对手」的全表,动一根另一根被推到最近的合法档。勾了 Jigsaw 时行数
// 另有一条限制——钉死 1(见上),于是列数的全表就是阶数本身。X 要求的阶数 ≥ 4 两边都已经
// 满足(非 Jigsaw 最小是 2×2 = 4 阶,Jigsaw 下限就是 4),不再单列。
const cols = (r: Read) => (jigsaw(r) ? range(4, top(r)) : range(2, half(r)))
// 2×2 被对称排除时躲开的是行数这一根:列数是主动方(勾 Jigsaw 那条也是优先不动列数),
// 所以落到的是 2×3 而不是 3×2。
const rows = (r: Read) =>
  jigsaw(r) ? [1] : range(r.int('Columns of sub-blocks') === 2 && !tiny(r) ? 3 : 2, half(r))
// 窗口:乘积不超上限的那些档。对方在表外(Game ID 带进来的)时窗口会空,给全表把它拉回来
// ——两边都空着的话谁也推不动,会留下一个上游不收的组合。
const beside = (list: readonly number[], other: number, cap: number) => {
  const fits = list.filter((v) => v * other <= cap)
  return fits.length ? fits : list
}

const solo: Game = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: {
    menu: verbatim,
    // 只把 Jigsaw 提到列数上面:它决定行数那一行画不画,开关得在它管的东西前面。
    // 其余四个照上游的顺序。
    order: [
      'Jigsaw (irregularly shaped sub-blocks)',
      'Columns of sub-blocks',
      'Rows of sub-blocks',
      '"X" (require every number in each main diagonal)',
      'Killer (digit sums)',
      'Symmetry',
      'Difficulty',
    ],
    params: [
      // 勾着 Jigsaw 时这根滑块就是阶数(行数钉在 1),不必给谁让路;勾掉时它是子块列数,
      // 全表到 ⌊上限/2⌋——再大就配不上任何合法的行数。
      int('Columns of sub-blocks', cols, {
        within: (r) => (jigsaw(r) ? cols(r) : beside(cols(r), r.int('Rows of sub-blocks'), top(r))),
      }),
      // 勾了 Killer 时对称整行不画,并钉成「无对称」:Killer 分支在对称那一段之前就退出了
      // (solo.c:3743 与 3823),生成根本不读它;留着只会让参数串和上游的 Killer 预设
      // (solo.c:324,SYMM_NONE)对不上,同一批题却显示成「自定义」。
      choice('Symmetry', { pin: (r) => (killer(r) ? SYMM_NONE : null) }),
      int('Rows of sub-blocks', rows, {
        within: (r) => beside(rows(r), r.int('Columns of sub-blocks'), top(r)),
        hide: jigsaw,
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: ({ params: p, prefs }) => {
    const parsed = params(p)
    if (!parsed) return null
    const cr = parsed.c * parsed.r
    return [
      ...digitKeys(cr),
      clearKey(),
      marksKey(),
      ...preferKeys(prefs, [PENCIL_HIGHLIGHT]),
    ]
  },
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: still,
}

export default solo
