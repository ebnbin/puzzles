import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec, Preset } from '../../engine/types'
import type { Param } from '../../games/util/params'
import { useStrings } from '../../i18n'
import Dock from '../../ui/Dock'
import Notice from '../../ui/Notice'
import Sheet from '../../ui/Sheet'

export default function PuzzleTypes({
  presets,
  selected,
  standard,
  spec,
  error,
  params,
  dock,
  onOpen,
  onSelectPreset,
  onCommit,
  onClose,
}: {
  presets: Preset[]
  // 上游算出来的「当前参数落在哪个预设上」(midend_which_preset,按编码后的参数串
  // 比对);不落在任何一个就是负数,一条都不选中。
  selected: number
  standard: number | null
  spec: DialogSpec | null
  error: string | null
  params: readonly Param[]
  // 停靠成右侧栏(桌面够宽)还是从下面拉起来。两种壳只差外框:里面的类名一样,
  // 内容的样式两边通用。
  dock: boolean
  onOpen: () => void
  onSelectPreset: (value: number) => void
  onCommit: () => void
  onClose: () => void
}) {
  const t = useStrings()

  // 参数列表常驻:面板开着就得有一份 config box。开的时候要一次;万一被别处收走
  // (C 侧只有一个 box)再要一次——不是挂在 mount 上,面板不重挂也得补得回来。
  const open = useRef(onOpen)
  open.current = onOpen
  useEffect(() => {
    if (!spec) open.current()
  }, [spec])

  const Shell = dock ? Dock : Sheet
  return (
    <Shell label={t.types.title} onClose={onClose}>
        <section>
          {/* 停靠时标题已经在面板头上,这里不再重一遍。 */}
          {!dock && <h2>{t.types.title}</h2>}
          <PresetList
            presets={presets}
            chosen={selected}
            standard={standard}
            onSelect={onSelectPreset}
          />
        </section>

        {spec && (
          <div className="sheet-params">
            <ConfigFields controls={spec.controls} params={params} onCommit={onCommit} />
            {error && <Notice text={error} />}
          </div>
        )}
    </Shell>
  )
}

// 上游把「自定义」也放在预设列表里,值是负数。
const usable = (preset: Preset) => preset.value >= 0

function PresetList({
  presets,
  chosen,
  standard,
  onSelect,
}: {
  presets: Preset[]
  chosen: number
  standard: number | null
  onSelect: (value: number) => void
}) {
  const t = useStrings()
  return (
    <ul className="sheet-presets">
      {/* 上游那条「自定义」不画:参数列表常驻之后它没有动作可做。参数不落在任何
          预设上时一条都不选中,那就是自定义。 */}
      {presets.filter(usable).map((preset, i) => {
        const isChosen = chosen === preset.value
        const isStandard = standard !== null && standard === preset.value
        return (
          <li key={i}>
            <label data-selected={isChosen} data-standard={isStandard || undefined}>
              <input
                type="radio"
                name="preset"
                checked={isChosen}
                onChange={() => onSelect(preset.value)}
              />
              {preset.name}
              {isStandard && <span className="sheet-preset-tag">{t.types.standard}</span>}
            </label>
          </li>
        )
      })}
    </ul>
  )
}
