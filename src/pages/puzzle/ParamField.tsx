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
export type ChoicesControl = Extract<DialogControl, { kind: 'choices' }>
// 有表的那几种申报;ordinal 是 choices 控件的画法,不进这里。
export type RangeParam = Exclude<Param, { kind: 'ordinal' }>

// 这一行能不能画成滑块:表空(别的控件的值认不出)就回落到文本框。
export const tableOf = (param: RangeParam, r: Read): readonly number[] =>
  param.kind === 'span' ? param.lo(r) : param.allowed(r)

function Slider({
  name,
  tag,
  list,
  value,
  text,
  format,
  note,
  foot,
  home = false,
  onPick,
}: {
  name: string
  tag?: string
  list: readonly number[]
  value: number
  // 松手状态下的读数用原文:当前值可能在表外(Game ID 输进来的),照实显示。
  text: string
  format: (v: number) => string
  // note 跟在读数后面(雷数占比那种短的),foot 是轨道下面单独一行。
  note?: (v: number) => string
  foot?: (v: number) => string
  // 表外的值一按就回第一档,不是吸到最近的一档(申报了 reset 的参数)。
  home?: boolean
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

  const found = list.indexOf(snap(list, value))
  // 表外的当前值(表外 = 上游给的,还没被夹):任何一按都先把它夹进表。
  const off = list[found] !== value
  const index = off && home ? 0 : found
  // 拖回原位松手不发 change,drag 会留下;落定后的位置一变就作废它。
  useEffect(() => setDrag(null), [index, list.length])
  const shown = drag ?? index
  const pinned = list.length <= 1
  const live = drag === null ? value : list[drag]
  // 松手且值在表内时用 format 画:这样 show 换掉的读数(粒度 t)也能显示出来。
  // 表外(Game ID 带进来的)照旧显示原文。
  const readout = drag !== null ? format(live) : off ? text : format(value)
  const said = format(list[shown] ?? live)
  const aside = note ?? foot
  // 读数列按表里最宽的一条留位(两头加中间等距采十来档就够):宽度跟着值变的话,
  // 拖到一半轨道就缩水,滑块会从手指底下跑掉。ch 是数字宽,「×」「%」比它宽一点,
  // 末尾那 0.25rem 就是给它们的富余。
  let wide = 3
  for (let i = 0; i <= 10; i++) {
    const v = list[Math.round((i * (list.length - 1)) / 10)]
    if (v !== undefined) wide = Math.max(wide, format(v).length + (note ? note(v).length + 1 : 0))
  }
  const step = (d: number) => {
    onPick(list[off ? index : index + d])
    input.current?.focus()
  }

  return (
    <>
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
          aria-valuetext={aside && Number.isFinite(live) ? `${said} (${aside(live)})` : said}
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
        <span
          className="dialog-param-value"
          style={{ minWidth: `max(3.2rem, calc(${wide}ch + 0.25rem))` }}
          aria-hidden="true"
        >
          {readout}
          {note && Number.isFinite(live) && <small>{note(live)}</small>}
        </span>
      </div>
      {foot && Number.isFinite(live) && (
        <p className="dialog-param-foot" aria-hidden="true">
          {foot(live)}
        </p>
      )}
    </>
  )
}

// 上游用下拉装的数值阶梯(申报了 ordinal 的 choices 控件):一档一个选项,读数是选项
// 文字,写回的仍是选项下标——和下拉交回去的值完全一样。
export function OrdinalField({
  control,
  onCommit,
}: {
  control: ChoicesControl
  onCommit: () => void
}) {
  const list = control.choices.map((_, i) => i)
  const name = (i: number) => control.choices[i] ?? ''
  return (
    <div className="dialog-param">
      <label className="dialog-param-head">{control.label}</label>
      <Slider
        name={control.label}
        list={list}
        value={control.value}
        text={name(control.value)}
        format={name}
        onPick={(v) => {
          control.value = v
          onCommit()
        }}
      />
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
  param: RangeParam
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
  // write 是写进控件的那一份(必须是上游认的量);show / foot 只管显示。
  const write = param.kind === 'int' ? String : (v: number) => formatFloat(v, param.digits)
  const show = param.kind === 'float' && param.show ? (v: number) => param.show!(v, read) : write
  const note = param.kind === 'int' && param.note ? (v: number) => param.note!(v, read) : undefined
  const foot = param.kind === 'float' && param.foot ? (v: number) => param.foot!(v, read) : undefined
  return (
    <div className="dialog-param">
      <label className="dialog-param-head">{control.label}</label>
      <Slider
        name={control.label}
        list={list}
        value={value}
        text={control.value}
        format={show}
        note={note}
        foot={foot}
        home={param.kind === 'float' && param.reset === true}
        onPick={(v) => {
          control.value = write(v)
          onCommit()
        }}
      />
    </div>
  )
}
