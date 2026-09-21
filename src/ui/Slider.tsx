// 带微调键的 slider:第一行 label,第二行是减号键、滑杆、加号键、当前值。刻度一律是
// 整数,值怎么显示由调用方给(小数、百分比、枚举原文都从 display 出)。拖动途中只更新
// 显示,松手(原生 change)才 onChange;加减键每按一下 onStep。
import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon'
import { useStrings } from '../i18n'

export default function Slider({
  label,
  value,
  min,
  max,
  display,
  onChange,
  onStep,
}: {
  label: string
  value: number
  min: number
  max: number
  display: (value: number) => string
  onChange: (value: number) => void
  onStep: (dir: 1 | -1) => void
}) {
  const t = useStrings()
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [live, setLive] = useState<number | null>(null)

  // React 的 onChange 每次 input 都发,松手那一下只有原生 change 知道。
  const settle = useRef(onChange)
  settle.current = onChange
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onSettle = () => {
      setLive(null)
      settle.current(Number(el.value))
    }
    el.addEventListener('change', onSettle)
    return () => el.removeEventListener('change', onSettle)
  }, [])

  const shown = live ?? value
  const fill = max > min ? ((shown - min) / (max - min)) * 100 : 0

  return (
    <div className="slider">
      <label className="slider-label" htmlFor={id}>
        {label}
      </label>
      <div className="slider-row">
        <button
          type="button"
          className="slider-step"
          aria-label={t.slider.decrease}
          disabled={value <= min}
          onClick={() => onStep(-1)}
        >
          <Icon name="minus" size={16} />
        </button>
        <input
          ref={ref}
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={shown}
          style={{ '--fill': `${fill}%` } as React.CSSProperties}
          aria-valuetext={display(shown)}
          onChange={(e) => setLive(Number(e.target.value))}
        />
        <button
          type="button"
          className="slider-step"
          aria-label={t.slider.increase}
          disabled={value >= max}
          onClick={() => onStep(1)}
        >
          <Icon name="add" size={16} />
        </button>
        <output className="slider-value" htmlFor={id}>
          {display(shown)}
        </output>
      </div>
    </div>
  )
}
