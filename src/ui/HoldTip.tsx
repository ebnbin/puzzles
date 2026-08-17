// 长按提示:按住一个控件问「这是什么」。useHoldTip 发 handlers 和 wasHeld
// (长按松手的那次 click 要吞掉),HoldTip 负责画。
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 400

const MARGIN = 84

const ABOVE = 96

type Tip = { text: string; left: number; top: number; below: boolean }

export function useHoldTip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const timer = useRef(0)
  const held = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const release = () => {
    window.clearTimeout(timer.current)
    setTip(null)
  }

  const holdToAsk = (text?: string) =>
    !text
      ? {}
      : {
          onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            const el = e.currentTarget
            held.current = false
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => {
              held.current = true
              const box = el.getBoundingClientRect()
              const below = box.top < ABOVE
              setTip({
                text,
                left: Math.min(
                  Math.max(box.left + box.width / 2, MARGIN),
                  window.innerWidth - MARGIN,
                ),
                top: below ? box.bottom : box.top,
                below,
              })
            }, HOLD_MS)
          },
          onPointerUp: release,
          onPointerCancel: release,
          onPointerLeave: release,
          onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        }

  const wasHeld = () => {
    if (!held.current) return false
    held.current = false
    return true
  }

  return { tip, holdToAsk, wasHeld }
}

// 必须渲染为它那一排的兄弟节点,不能塞进 keypad 或按键行里:那两处各自设了
// position+z-index(自成 stacking context,同在 1),塞进去的 tip 再大的 z-index
// 都封在层 1,会垫到 z=2 的介绍浮层下面。它是 fixed、不占位,放哪都不花钱。
export default function HoldTip({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div
      className="hold-tip"
      role="status"
      data-below={tip.below ? 'true' : undefined}
      style={{ left: tip.left, top: tip.top }}
    >
      {tip.text}
    </div>
  )
}
