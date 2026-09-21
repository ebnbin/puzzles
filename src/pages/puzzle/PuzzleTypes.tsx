// 类型面板的内容:预设列表 + 常驻的自定义参数表。壳(底部 sheet 还是停靠栏)由 PuzzleHost
// 按屏幕宽度套,这里不知道自己住在哪种壳里,只在停靠时省掉一个重复的标题。
import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec, Preset } from '../../engine/types'
import type { Custom } from '../../games/util/custom'
import { useStrings } from '../../i18n'
import Notice from '../../ui/Notice'

// 上游把「自定义」也塞在预设列表里,值是负数(emcc.c:1022)。不画它:参数表常驻之后
// 它没有动作可做;它在不在,只用来判断这个游戏能不能自定义。
const isCustom = (preset: Preset) => preset.value !== null && preset.value < 0

export default function PuzzleTypes({
  presets,
  selected,
  standard,
  custom,
  declared,
  customError,
  docked,
  onSelectPreset,
  onOpenCustom,
  onCommitCustom,
  onAbandon,
  onSettle,
}: {
  presets: Preset[]
  // 引擎报的「当前参数落在哪条预设上」:按完整编码逐字比对(midend_which_preset),
  // 命不中就是负数,一条都不选中——那就是自定义组合。
  selected: number
  standard: number | null
  custom: DialogSpec | null
  // 这个游戏对参数表的申报(范围、联动、词);没申报的游戏画文本框。
  declared: Custom | undefined
  customError: string | null
  docked: boolean
  onSelectPreset: (value: number) => void
  onOpenCustom: () => void
  onCommitCustom: () => void
  onAbandon: () => void
  onSettle: (done?: boolean) => void
}) {
  const t = useStrings()

  // 面板挂着,参数 box 就归它:挂载要一份,卸载时把还开着的退掉。退掉这一步不能交给
  // 壳的 close 回调:换壳(宽窄切换)和换面板都是卸载,不都经过 close。
  const configurable = presets.some(isCustom)
  const open = useRef(onOpenCustom)
  open.current = onOpenCustom
  const abandon = useRef(onAbandon)
  abandon.current = onAbandon
  useEffect(() => {
    if (configurable) open.current()
    return () => abandon.current()
  }, [])

  return (
    <>
      <section>
        {!docked && <h2>{t.types.title}</h2>}
        <PresetList
          presets={presets}
          chosen={selected}
          standard={standard}
          onSelect={(value) => {
            onSelectPreset(value)
            onSettle()
          }}
        />
      </section>

      {custom && (
        <div className="sheet-custom">
          <ConfigFields
            controls={custom.controls}
            declared={declared}
            onCommit={onCommitCustom}
            onSettle={onSettle}
          />
          {customError && <Notice text={customError} />}
        </div>
      )}
    </>
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
      {presets
        .filter((preset) => !isCustom(preset))
        .map((preset, i) => {
          const isChosen = chosen === preset.value
          const isStandard = standard !== null && standard === preset.value
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
                <label data-selected={isChosen} data-standard={isStandard || undefined}>
                  <input
                    type="radio"
                    name="preset"
                    checked={isChosen}
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
