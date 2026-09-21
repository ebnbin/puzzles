// 类型面板的内容:预设列表 + 自定义参数。壳(底部 sheet 还是停靠栏)由 PuzzleHost
// 按屏幕宽度套,这里不知道自己住在哪种壳里,只在停靠时省掉一个重复的标题。
import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec, Preset } from '../../engine/types'
import { useStrings } from '../../i18n'
import Notice from '../../ui/Notice'

const CUSTOM = -1

export default function PuzzleTypes({
  presets,
  selected,
  standard,
  custom,
  customError,
  docked,
  onSelectPreset,
  onOpenCustom,
  onCloseCustom,
  onCommitCustom,
  onAbandon,
  onSettle,
}: {
  presets: Preset[]
  selected: number
  standard: number | null
  custom: DialogSpec | null
  customError: string | null
  docked: boolean
  onSelectPreset: (value: number) => void
  onOpenCustom: () => void
  onCloseCustom: () => void
  onCommitCustom: () => void
  onAbandon: () => void
  onSettle: (done?: boolean) => void
}) {
  const t = useStrings()

  const choosePreset = (value: number) => {
    // 参数的 config box 开着时后端不接受 preset:选之前必须先把它关掉。
    if (custom) onCloseCustom()
    onSelectPreset(value)
    onSettle()
  }

  // 面板挂着,参数 box 就归它:进门时当前是自定义参数就要一份,卸载时把还开着的退掉。
  // 退掉这一步不能交给壳的 close 回调:换壳(宽窄切换)和换面板都是卸载,不都经过 close。
  const open = useRef(onOpenCustom)
  open.current = onOpenCustom
  const abandon = useRef(onAbandon)
  abandon.current = onAbandon
  useEffect(() => {
    if (selected < 0) open.current()
    return () => abandon.current()
  }, [])

  const paramsRef = useRef<HTMLDivElement>(null)
  const shown = !!custom
  useEffect(() => {
    if (shown) paramsRef.current?.scrollIntoView({ block: 'nearest' })
  }, [shown])

  return (
    <>
      <section>
        {!docked && <h2>{t.types.title}</h2>}
        <PresetList
          presets={presets}
          chosen={custom ? CUSTOM : selected}
          standard={standard}
          onSelect={choosePreset}
          onChooseCustom={() => {
            onOpenCustom()
            onSettle()
          }}
        />
      </section>

      {custom && (
        <div className="sheet-custom" ref={paramsRef}>
          <ConfigFields controls={custom.controls} onCommit={onCommitCustom} onSettle={onSettle} />
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
  onChooseCustom,
}: {
  presets: Preset[]
  chosen: number
  standard: number | null
  onSelect: (value: number) => void
  onChooseCustom: () => void
}) {
  const t = useStrings()
  return (
    <ul className="sheet-presets">
      {presets.map((preset, i) => {
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
                  onChooseCustom={onChooseCustom}
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
                  onChange={() =>
                    custom ? onChooseCustom() : onSelect(preset.value as number)
                  }
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
