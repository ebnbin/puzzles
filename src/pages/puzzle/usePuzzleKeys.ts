// 谜题页唯一的物理键盘通路。判据是「这一按该不该归谜题」,不是「谁有焦点」:
// 焦点不承重,棋盘丢了焦点照样能玩。不要改回 canvas 的 onKeyDown——那条路上
// 每加一个会抢焦点的按钮就得记得把焦点还回来,漏了不报错,build 照样绿
// (会安静地坏掉的那一类,见 docs/keys.md)。守在 scripts/check-focus.mjs。
import { useEffect } from 'react'
import type { PuzzleApi } from '../../engine/types'
import type { Stroke } from '../../games/game'

// 单独按下的修饰键不是走子:上游认不出它(key() 返回 false),喂进去只会给
// 观察器添一条噪声输入。
const BARE = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
])

// 上游的四个裸字母快捷键里我们补三个(midend.c:1005-1036)。q 不补:emcc 拿到
// PKR_QUIT 什么都不做,网页里本来就退不出去。
//
// 大小写两个键名都收,但按住 Shift 的那一次不算:上游比的是带修饰位的 button,
// 而 emcc 会给 Shift 的按键加上 MOD_SHFT(emcc.c:445),'N'|MOD_SHFT 匹配不上
// 'N',所以在这个前端里 Shift+N 从来就不是快捷键。CapsLock 打出的 N 没有那一位,
// 是快捷键——这里的判据要和它一模一样。
export type Shortcut = 'newGame' | 'undo' | 'redo'
const SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  n: 'newGame', N: 'newGame',
  u: 'undo', U: 'undo',
  r: 'redo', R: 'redo',
}

// 焦点当下归谁。'control' 只让出 Space / Enter——按钮和链接只对这两个键有
// 意义,别的键让给谜题,玩家就不必为了继续玩而先去点一下棋盘。
type Seat = 'typing' | 'control' | 'none'

function seatOf(): Seat {
  const el = document.activeElement as HTMLElement | null
  if (!el || el === document.body) return 'none'
  if (el.isContentEditable) return 'typing'
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return 'typing'
  // 棋盘自己带 tabindex(键盘用户要 Tab 得到它),但它就是谜题,不算控件。
  if (tag === 'CANVAS') return 'none'
  return el.matches('button, a[href], [tabindex]') ? 'control' : 'none'
}

export function usePuzzleKeys({
  ready,
  blocked,
  apiRef,
  acted,
  typed,
  volatile,
  readPrefs,
  shortcuts,
  onShortcut,
}: {
  ready: boolean
  blocked: boolean
  apiRef: React.RefObject<PuzzleApi | null>
  acted: () => void
  typed: (s: Stroke) => void
  volatile: boolean
  readPrefs: () => void
  // 全局那一位。引擎里的同名偏好被我们强制关掉了,见 useShortcuts.SHORTCUTS_OFF。
  shortcuts: boolean
  onShortcut: (which: Shortcut) => void
}) {
  useEffect(() => {
    if (!ready || blocked) return
    const onKey = (e: KeyboardEvent) => {
      const api = apiRef.current
      if (!api || e.isComposing) return
      // Tab 是导航,永远不给谜题;Meta / Alt 组合归系统和浏览器。
      if (e.key === 'Tab' || e.metaKey || e.altKey || BARE.has(e.key)) return
      // 浏览器的快捷键全落在 Ctrl + 单字符上,而上游把任何单字符连 MOD_CTRL
      // 一起交给 midend(emcc.c:402),Ctrl+R 会被认领、刷新就没了。Ctrl+方向
      // 这类浏览器不要的组合照旧交给谜题(net 靠它移信号源)。
      if (e.ctrlKey && e.key.length === 1) return
      const seat = seatOf()
      if (seat === 'typing') return
      if (seat === 'control' && (e.key === 'Enter' || e.key === ' ')) return

      acted()
      typed({
        key: e.key,
        ...(e.location === 3 ? { pad: true as const } : {}),
        ...(e.shiftKey ? { shift: true as const } : {}),
        ...(e.ctrlKey ? { ctrl: true as const } : {}),
      })
      // 先问引擎要不要。答不要(PKR_UNUSED)才轮到快捷键——这一条就是上游的
      // 判据,照抄它,拿 n/u/r 当走子键的游戏才不会被抢走。
      if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0)) {
        e.preventDefault()
      } else if (shortcuts && !e.shiftKey && SHORTCUTS[e.key]) {
        e.preventDefault()
        onShortcut(SHORTCUTS[e.key])
      }
      if (volatile) readPrefs()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, blocked, apiRef, acted, typed, volatile, readPrefs, shortcuts, onShortcut])
}
