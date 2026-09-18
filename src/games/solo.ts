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
// 除上游校验外只去掉两种「任何种子都开不出局」的组合,依据是代码推导,不是实测:
// ① 2 阶 Jigsaw 配 4 向旋转 / 4 向镜像 / 8 向镜像:这三种对称把四个格并成一个轨道,删提示
//    只有「不删」或「删成空盘」两种结果,而空盘的 2 阶题有两个解(1、2 对调)、求解器不收,
//    所以提示恒是满盘四格;满盘的题面要写 11 个字符(网格 7 + 逗号 + 块结构 3),而
//    encode_puzzle_desc 的预算只有 10(solo.c:3370、3414),断言必停。
// ② 2 阶 Killer:两格的笼子恒是 {1,2}、和恒为 3,零信息,题目必然两解;三格以上的笼子必有
//    重复数字,而上游按「笼内不重复」推(solo.c:1888),必判无解。两条路都回不来。
// 其余一律放行。2×2 配那几种对称只是一部分种子撞上同一个断言,换个种子就能开出来,不属于
// 「必定开不出」,所以不拦。
const killer = (r: Read) => r.flag('Killer (digit sums)')
const order = (r: Read) => (killer(r) ? 9 : 31)
const jigsaw = (r: Read) => r.flag('Jigsaw (irregularly shaped sub-blocks)')
const xtype = (r: Read) => r.flag('"X" (require every number in each main diagonal)')
const NO_ORDER2 = [2, 5, 7]
const SYMM_NONE = 0
const crashes = (r: Read) => NO_ORDER2.includes(r.pick('Symmetry'))

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
      // 勾着 Jigsaw 时这根滑块就是阶数(行数钉在 1),下限直接是上游对阶数的要求;
      // 勾掉时它是子块列数,上限留一半给行数(行数至少 2)。
      int('Columns of sub-blocks', (r) =>
        jigsaw(r)
          ? range(xtype(r) ? 4 : 2, order(r)).filter(
              (c) => !(c === 2 && (crashes(r) || killer(r))),
            )
          : range(2, Math.floor(order(r) / 2)),
      ),
      // 勾了 Killer 时对称整行不画,并钉成「无对称」:Killer 分支在对称那一段之前就退出了
      // (solo.c:3743 与 3823),生成根本不读它;留着只会让参数串和上游的 Killer 预设
      // (solo.c:324,SYMM_NONE)对不上,同一批题却显示成「自定义」。
      choice('Symmetry', { pin: (r) => (killer(r) ? SYMM_NONE : null) }),
      int(
        'Rows of sub-blocks',
        (r) => {
          if (jigsaw(r)) return [1]
          const c = r.int('Columns of sub-blocks')
          return range(2, Math.floor(order(r) / c))
        },
        { hide: jigsaw },
      ),
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
