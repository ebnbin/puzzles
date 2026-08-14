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

export function HoldTip({ tip }: { tip: Tip | null }) {
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
