import { Fragment, useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import ErrorNote from './ErrorNote'
import { Overline } from '@/components/ui/overline'
import { RadioGroup, RadioGroupChip } from '@/components/ui/radio-group'
import { Sheet } from '@/components/ui/sheet'
import type { DialogSpec, Preset } from './engine/types'
import { useStrings } from './i18n'

const CUSTOM = -1

const isCustom = (preset: Preset) =>
  preset.value !== null && preset.value < 0

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

  const chosen = custom ? CUSTOM : selected

  const choose = (value: string) => {
    if (value === 'custom') {
      onOpenCustom()
      return
    }
    // 参数的 config box 开着时后端不接受 preset:选之前必须先把它关掉。
    if (custom) onCloseCustom()
    onSelectPreset(Number(value))
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
        <Overline>{t.types.title}</Overline>
        <RadioGroup
          value={chosen < 0 ? 'custom' : String(chosen)}
          onValueChange={choose}
          className="flex flex-wrap gap-[0.4rem]"
        >
          <PresetItems presets={presets} standard={standard} />
        </RadioGroup>
      </section>

      {custom && (
        <div className="mt-4 animate-drop-in" ref={paramsRef}>
          <ConfigFields controls={custom.controls} onCommit={onCommitCustom} />
          {customError && <ErrorNote text={customError} />}
        </div>
      )}
    </Sheet>
  )
}

function PresetItems({
  presets,
  standard,
}: {
  presets: Preset[]
  standard: number | null
}) {
  const t = useStrings()
  return (
    <>
      {presets.map((preset, i) =>
        preset.submenu ? (
          <Fragment key={i}>
            <span className="w-full text-2xs font-semibold uppercase tracking-[0.06em] text-faint">
              {preset.name}
            </span>
            <div className="flex w-full flex-wrap gap-[0.4rem] pl-3">
              <PresetItems presets={preset.submenu} standard={standard} />
            </div>
          </Fragment>
        ) : (
          <RadioGroupChip
            key={i}
            value={isCustom(preset) ? 'custom' : String(preset.value)}
          >
            {preset.name}
            {!isCustom(preset) && standard !== null && standard === preset.value && (
              <span className="text-2xs font-medium tracking-[0.02em] text-muted-foreground">
                {t.types.standard}
              </span>
            )}
          </RadioGroupChip>
        ),
      )}
    </>
  )
}
