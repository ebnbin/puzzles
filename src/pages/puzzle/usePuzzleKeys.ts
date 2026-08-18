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
}: {
  ready: boolean
  blocked: boolean
  apiRef: React.RefObject<PuzzleApi | null>
  acted: () => void
  typed: (s: Stroke) => void
  volatile: boolean
  readPrefs: () => void
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
      if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
        e.preventDefault()
      if (volatile) readPrefs()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, blocked, apiRef, acted, typed, volatile, readPrefs])
}
