import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec, Preset } from '../engine/types'
import { useStrings } from '../i18n'
import Notice from '../ui/Notice'
import Sheet from '../ui/Sheet'

const CUSTOM = -1

export default function PuzzleTypes({
  presets,
  selected,
  standard,
  custom,
  customError,
  onSelectPreset,
  onOpenCustom,
  onCloseCustom,
  onCommitCustom,
  onClose,
}: {
  presets: Preset[]
  selected: number
  standard: number | null
  custom: DialogSpec | null
  customError: string | null
  onSelectPreset: (value: number) => void
  onOpenCustom: () => void
  onCloseCustom: () => void
  onCommitCustom: () => void
  onClose: () => void
}) {
  const t = useStrings()

  const choosePreset = (value: number) => {
    // 参数的 config box 开着时后端不接受 preset:选之前必须先把它关掉。
    if (custom) onCloseCustom()
    onSelectPreset(value)
  }

  const open = useRef(onOpenCustom)
  open.current = onOpenCustom
  useEffect(() => {
    if (selected < 0) open.current()
  }, [])

  const paramsRef = useRef<HTMLDivElement>(null)
  const shown = !!custom
  useEffect(() => {
    if (shown) paramsRef.current?.scrollIntoView({ block: 'nearest' })
  }, [shown])

  return (
    <Sheet label={t.types.title} onClose={onClose}>
        <section>
          <h2>{t.types.title}</h2>
          <PresetList
            presets={presets}
            chosen={custom ? CUSTOM : selected}
            standard={standard}
            onSelect={choosePreset}
            onChooseCustom={onOpenCustom}
          />
        </section>

        {custom && (
          <div className="sheet-custom" ref={paramsRef}>
            <ConfigFields controls={custom.controls} onCommit={onCommitCustom} />
            {customError && <Notice text={customError} />}
          </div>
        )}
    </Sheet>
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
