import { useEffect, useRef } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec, Preset } from './engine/types'
import { useStrings } from './i18n'
import { useSheetDrag } from './useSheetDrag'

/** The back end's index for the parameters; every real preset is at least 0. */
const CUSTOM = -1

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
 * Everything here takes effect as you do it. There is no button to press: a
 * preset is a new game the moment you pick it, and a parameter is a new game
 * the moment you settle it — leave the field, press Enter, tick the box. If
 * the back end will not have the numbers it says so underneath them, and the
 * game you were playing is still there.
 *
 * And the sheet stays up through all of it. Nothing you do here dismisses it,
 * so a size can be tried and tried again, and the one press that closes it is
 * yours.
 *
 * To the back end the parameters are still a modal dialog, which is why
 * showing and hiding them is `onOpenCustom` and `onCloseCustom` rather than
 * local state: something has to answer the config box the C is sitting in.
 * Picking a preset while it is open cancels it.
 */
export default function PuzzleTypes({
  presets,
  selected,
  custom,
  customError,
  onSelectPreset,
  onOpenCustom,
  onCloseCustom,
  onCommitCustom,
  onClose,
}: {
  presets: Preset[]
  /** Which preset the game being played matches; negative for none of them. */
  selected: number
  /** The parameters, while they are shown. */
  custom: DialogSpec | null
  /** What the back end said about the values, if it rejected them. */
  customError: string | null
  onSelectPreset: (value: number) => void
  onOpenCustom: () => void
  onCloseCustom: () => void
  onCommitCustom: () => void
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()

  const choosePreset = (value: number) => {
    // The back end will not take a preset while it is sitting in the config
    // box the parameters came from.
    if (custom) onCloseCustom()
    onSelectPreset(value)
  }

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
            chosen={custom ? CUSTOM : selected}
            onSelect={choosePreset}
            onChooseCustom={onOpenCustom}
          />
        </section>

        {custom && (
          <div className="sheet-custom">
            <ConfigFields
              controls={custom.controls}
              autoFocus
              onCommit={onCommitCustom}
            />
            {/* The back end refuses a set of parameters by handing back a
                sentence. It belongs against the fields that were refused, not
                under the title bar behind this sheet. */}
            {customError && (
              <p className="sheet-custom-error" role="alert">
                {customError}
              </p>
            )}
          </div>
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
 * summed up in its name. Which is why choosing it needs its own callback.
 */
function PresetList({
  presets,
  chosen,
  onSelect,
  onChooseCustom,
}: {
  presets: Preset[]
  /** The type in force, or CUSTOM while its parameters are being written. */
  chosen: number
  onSelect: (value: number) => void
  onChooseCustom: () => void
}) {
  return (
    <ul className="sheet-presets">
      {presets.map((preset, i) => {
        const custom = preset.value !== null && preset.value < 0
        const isChosen = custom ? chosen < 0 : chosen === preset.value
        return (
          <li key={i}>
            {preset.submenu ? (
              <>
                <span className="sheet-preset-group">{preset.name}</span>
                <PresetList
                  presets={preset.submenu}
                  chosen={chosen}
                  onSelect={onSelect}
                  onChooseCustom={onChooseCustom}
                />
              </>
            ) : (
              <label
                className={custom ? 'sheet-preset-custom' : undefined}
                data-selected={isChosen}
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
              </label>
            )}
          </li>
        )
      })}
    </ul>
  )
}
