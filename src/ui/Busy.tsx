// 生成中的遮罩:挡住整页,唯一出口是取消。只有生成超过宽限期才出现。
// 它不报进度——上游的生成没有进度可报(midend_new_game 一路同步),只说「在算」。
// 不锁背景滚动:遮罩是 fixed 满屏,而谜题页本来就按视口排版,没有可滚的东西。
import { useEffect, useRef } from 'react'

export default function Busy({
  text,
  cancel,
  onCancel,
}: {
  text: string
  cancel: string
  onCancel: () => void
}) {
  const button = useRef<HTMLButtonElement>(null)

  // 焦点收进来:遮罩期间背后的东西都不该被 Tab 到,Esc 也要有人接。
  useEffect(() => {
    button.current?.focus()
  }, [])

  return (
    <div
      className="busy"
      role="alertdialog"
      aria-modal="true"
      aria-label={text}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
    >
      <div className="busy-card">
        <span className="busy-spin" aria-hidden="true" />
        <p className="busy-text">{text}</p>
        <button type="button" ref={button} className="busy-cancel" onClick={onCancel}>
          {cancel}
        </button>
      </div>
    </div>
  )
}
