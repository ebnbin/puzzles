import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec, Preset } from './engine/types'
import { useStrings } from './i18n'
import { useSheetDrag } from './useSheetDrag'

/**
 * Which puzzle you are being set, and nothing else.
 *
 * Its own sheet beside the menu rather than a section inside it: the menu is
 * what you do to the game in front of you — undo it, restart it, give it away
 * — and this is what game you are given next. They are opened for different
 * reasons and one of them is a long list.
 *
 * The parameters open inside this sheet rather than in a dialog on top of it.
 * A dialog over a sheet is two layers deep for one choice, and they are not a
 * second question anyway: "Custom" is one of the types, and these are what it
 * means. Choosing it shows them; choosing a preset instead takes them away.
 *
 * To the back end they are still a modal dialog, though, which is why showing
 * and hiding them is `onOpenCustom` and `onCloseCustom` rather than local
 * state: something has to answer the config box the C is sitting in.
 */
export default function PuzzleTypes({
  presets,
  selected,
  custom,
  customError,
  onSelectPreset,
  onOpenCustom,
  onApplyCustom,
  onClose,
}: {
  presets: Preset[]
  selected: number
  /** The parameters, while they are open; null while they are collapsed. */
  custom: DialogSpec | null
  /** What the back end said about the values, if it rejected them. */
  customError: string | null
  onSelectPreset: (value: number) => void
  onOpenCustom: () => void
  onApplyCustom: () => void
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()

  /*
   * Open the parameters when they are what is in force.
   *
   * `selected` is the back end's own answer to which preset the current game
   * matches — `midend_which_preset`, negative for none of them. Negative is
   * therefore exactly the case where the chips above say nothing about the
   * game you are playing, and the fields are the only description of it, so
   * they start shown rather than behind another press.
   *
   * On mount only: collapsing them is an answer to a question, and it would
   * be a poor one if the sheet asked again straight away.
   */
  const open = useRef(onOpenCustom)
  open.current = onOpenCustom
  useEffect(() => {
    if (selected < 0) open.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="sheet-dimmer" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t.types.title}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        <div className="sheet-handle" aria-hidden="true">
          <div className="sheet-grip" />
        </div>

        <section>
          <h2>{t.types.title}</h2>
          <PresetList
            presets={presets}
            selected={selected}
            customChosen={!!custom || selected < 0}
            onSelect={onSelectPreset}
            onChooseCustom={onOpenCustom}
          />
        </section>

        {custom && (
          <form
            className="sheet-custom"
            onSubmit={(e) => {
              e.preventDefault()
              onApplyCustom()
            }}
          >
            <ConfigFields controls={custom.controls} autoFocus />
            {/* The back end refuses a set of parameters by handing back a
                sentence. It belongs against the fields that were refused, not
                under the title bar behind this sheet. */}
            {customError && (
              <p className="sheet-custom-error" role="alert">
                {customError}
              </p>
            )}
            <div className="sheet-custom-buttons">
              <button type="submit" className="is-primary">
                {t.types.apply}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * Presets can nest; render the tree as grouped radios.
 *
 * Chips rather than a list of rows: a puzzle can offer twenty of these, and as
 * rows that is a screen of scrolling to reach the bottom one. They are real
 * radios — the group is a single choice, arrow keys should move through it, and
 * a screen reader should say so.
 *
 * "Custom…" is one of them. It arrives in the same list from the back end, with
 * a negative value where the others have their index, and it is a type like any
 * other: the difference is only that its parameters are shown below rather than
 * summed up in its name. Which is why choosing it needs its own callback, and
 * why it is checked either when it has been chosen or when nothing else
 * matches the game being played.
 */
function PresetList({
  presets,
  selected,
  customChosen,
  onSelect,
  onChooseCustom,
}: {
  presets: Preset[]
  selected: number
  customChosen: boolean
  onSelect: (value: number) => void
  onChooseCustom: () => void
}) {
  return (
    <ul className="sheet-presets">
      {presets.map((preset, i) => {
        const custom = preset.value !== null && preset.value < 0
        const chosen = custom ? customChosen : !customChosen && selected === preset.value
        return (
          <li key={i}>
            {preset.submenu ? (
              <>
                <span className="sheet-preset-group">{preset.name}</span>
                <PresetList
                  presets={preset.submenu}
                  selected={selected}
                  customChosen={customChosen}
                  onSelect={onSelect}
                  onChooseCustom={onChooseCustom}
                />
              </>
            ) : (
              <label
                className={custom ? 'sheet-preset-custom' : undefined}
                data-selected={chosen}
              >
                <input
                  type="radio"
                  name="preset"
                  checked={chosen}
                  onChange={() =>
                    custom ? onChooseCustom() : onSelect(preset.value as number)
                  }
                />
                {preset.name}
              </label>
            )}
          </li>
        )
      })}
    </ul>
  )
}
