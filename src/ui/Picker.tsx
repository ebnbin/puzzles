// 多选一,全部选项摊开:第一行 label,第二行是一条分段轨道,放不下就换行,一个不藏。
// 标记同 segmented(label + 隐藏 radio + data-selected),但样式独立,不和语言切换共用。
import { useId } from 'react'

export default function Picker({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: number
  onChange: (index: number) => void
}) {
  const id = useId()
  return (
    <div className="picker">
      <span className="picker-label" id={id}>
        {label}
      </span>
      <div className="picker-options" role="radiogroup" aria-labelledby={id}>
        {options.map((text, i) => (
          <label key={i} data-selected={i === value}>
            <input
              type="radio"
              name={id}
              checked={i === value}
              onChange={() => onChange(i)}
            />
            {text}
          </label>
        ))}
      </div>
    </div>
  )
}
