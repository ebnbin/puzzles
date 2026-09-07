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
  // 比对);不落在任何一个就是负数,显示为「自定义」。
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

  // 参数列表常驻:面板一出来就要一份 config box,选了预设也不收起来(宿主换完
  // 参数会再要一份)。
  const open = useRef(onOpen)
  open.current = onOpen
  useEffect(() => {
    open.current()
  }, [])

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
      {presets.map((preset, i) => {
        // 「自定义」这一条是状态不是选项:参数列表常驻之后它没有动作可做,只报告
        // 当前参数不落在任何预设上。留在同一组里,选中态才说得出来。
        const custom = preset.value !== null && preset.value < 0
        const isChosen = custom ? chosen < 0 : chosen === preset.value
        const isStandard = !custom && standard !== null && standard === preset.value
        return (
          <li key={i}>
            {preset.submenu ? (
              <>
                <span className="sheet-preset-group">{preset.name}</span>
                <PresetList
                  presets={preset.submenu}
                  chosen={chosen}
                  standard={standard}
                  onSelect={onSelect}
                />
              </>
            ) : (
              <label
                className={custom ? 'sheet-preset-custom' : undefined}
                data-selected={isChosen}
                data-standard={isStandard || undefined}
              >
                <input
                  type="radio"
                  name="preset"
                  checked={isChosen}
                  disabled={custom}
                  onChange={() => onSelect(preset.value as number)}
                />
                {preset.name}
                {isStandard && <span className="sheet-preset-tag">{t.types.standard}</span>}
              </label>
            )}
          </li>
        )
      })}
    </ul>
  )
}
