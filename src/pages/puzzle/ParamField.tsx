// 范围模型驱动的数字控件,只用在自定义参数面板:一条 Param 一行。滑块按表的
// 下标走(表不连续也每一档合法),两侧 −/+ 单步微调,读数在行尾。拖动中只更新
// 读数,松手才落定——React 的 onChange 是 input 事件,拖一路会开一路新局,所以
// 落定挂在原生 change 上。
import { useEffect, useId, useRef, useState } from 'react'
import type { DialogControl } from '../../engine/types'
import type { Param, Read } from '../../games/util/params'
import { formatFloat, formatSpan, parseSpan, snap } from '../../games/util/params'
import { useStrings } from '../../i18n'
import Icon from '../../ui/Icon'

export type StringControl = Extract<DialogControl, { kind: 'string' }>

// 这一行能不能画成滑块:表空(别的控件的值认不出)就回落到文本框。
export const tableOf = (param: Param, r: Read): readonly number[] =>
  param.kind === 'span' ? param.lo(r) : param.allowed(r)

function Slider({
  name,
  tag,
  list,
  value,
  text,
  format,
  note,
  onPick,
}: {
  name: string
  tag?: string
  list: readonly number[]
  value: number
  // 松手状态下的读数用原文:当前值可能在表外(Game ID 输进来的),照实显示。
  text: string
  format: (v: number) => string
  note?: (v: number) => string
  onPick: (v: number) => void
}) {
  const t = useStrings()
  const id = useId()
  const [drag, setDrag] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef({ list, value, onPick })
  latest.current = { list, value, onPick }

  useEffect(() => {
    const el = input.current
    if (!el) return
    const done = () => {
      const { list, value, onPick } = latest.current
      const v = list[Number(el.value)]
      setDrag(null)
      if (v !== undefined && v !== value) onPick(v)
    }
    el.addEventListener('change', done)
    return () => el.removeEventListener('change', done)
  }, [])

  const index = list.indexOf(snap(list, value))
  // 表外的当前值(表外 = 上游给的,还没被夹):任何一按都先把它夹进表。
  const off = list[index] !== value
  // 拖回原位松手不发 change,drag 会留下;落定后的位置一变就作废它。
  useEffect(() => setDrag(null), [index, list.length])
  const shown = drag ?? index
  const pinned = list.length <= 1
  const live = drag === null ? value : list[drag]
  const readout = drag === null ? text : format(live)
  const said = format(list[shown] ?? live)
  const step = (d: number) => {
    onPick(list[off ? index : index + d])
    input.current?.focus()
  }

  return (
    <div className="dialog-param-track">
      {tag && (
        <label className="dialog-param-tag" htmlFor={id}>
          {tag}
        </label>
      )}
      <button
        type="button"
        aria-label={`${name}: ${t.types.decrease}`}
        disabled={pinned || (!off && index <= 0)}
        onClick={() => step(-1)}
      >
        <Icon name="minusSquare" />
      </button>
      <input
        ref={input}
        id={id}
        type="range"
        aria-label={name}
        aria-valuetext={note && Number.isFinite(live) ? `${said} (${note(live)})` : said}
        min={0}
        max={Math.max(0, list.length - 1)}
        step={1}
        value={shown}
        disabled={pinned}
        onChange={(e) => setDrag(Number(e.target.value))}
        onBlur={() => setDrag(null)}
      />
      <button
        type="button"
        aria-label={`${name}: ${t.types.increase}`}
        disabled={pinned || (!off && index >= list.length - 1)}
        onClick={() => step(1)}
      >
        <Icon name="plusSquare" />
      </button>
      <span className="dialog-param-value" data-note={note ? '' : undefined} aria-hidden="true">
        {readout}
        {note && Number.isFinite(live) && <small>{note(live)}</small>}
      </span>
    </div>
  )
}

export default function ParamField({
  control,
  param,
  read,
  onCommit,
}: {
  control: StringControl
  param: Param
  read: Read
  onCommit: () => void
}) {
  const t = useStrings()

  if (param.kind === 'span') {
    const [lo, hi] = parseSpan(control.value)
    const los = param.lo(read)
    // hi 的表看 lo;lo 在表外时按它落定后会去的位置算,别拿表外值去问。
    const his = param.hi(read, snap(los, lo))
    const pick = (a: number, b: number) => {
      control.value = formatSpan(a, b)
      onCommit()
    }
    return (
      <div className="dialog-param">
        <label className="dialog-param-head">{control.label}</label>
        <Slider
          name={`${control.label}: ${t.types.min}`}
          tag={t.types.min}
          list={los}
          value={lo}
          text={String(lo)}
          format={String}
          onPick={(v) => pick(v, hi)}
        />
        <Slider
          name={`${control.label}: ${t.types.max}`}
          tag={t.types.max}
          list={his}
          value={hi}
          text={String(hi)}
          format={String}
          onPick={(v) => pick(lo, v)}
        />
      </div>
    )
  }

  const list = param.allowed(read)
  const value = param.kind === 'int' ? parseInt(control.value, 10) : parseFloat(control.value)
  const format = param.kind === 'int' ? String : (v: number) => formatFloat(v, param.digits)
  const note = param.kind === 'int' && param.note ? (v: number) => param.note!(v, read) : undefined
  return (
    <div className="dialog-param">
      <label className="dialog-param-head">{control.label}</label>
      <Slider
        name={control.label}
        list={list}
        value={value}
        text={control.value}
        format={format}
        note={note}
        onPick={(v) => {
          control.value = format(v)
          onCommit()
        }}
      />
    </div>
  )
}
