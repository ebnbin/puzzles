import { useCallback, useState } from 'react'
import { KNOBS, setTuning, TUNING_DEFAULTS, tuning } from './engine/palette'
import type { Tuning } from './engine/palette'
import { useStrings } from './i18n'

/**
 * Six sliders over the constants in engine/palette.ts, and a board that
 * repaints while you drag.
 *
 * The numbers in that file each carry a paragraph of measurement, which is the
 * right record but a poor way to develop a feel for them. This is the other
 * way round: no workings, one sentence each, and the board itself as the
 * readout. Neither replaces the other — the comment says why the value is what
 * it is, this says what the value does.
 *
 * A rail down the side of the screen rather than a dialog, because comparing
 * two settings means going back and forth and a dialog charges for every trip.
 * It takes its width out of the board's, which is why the stylesheet only
 * mounts it past 64em: below that the board is the scarce thing.
 *
 * It holds no palette knowledge of its own. The travel, the recommended span
 * and the order come from `KNOBS`, next to the constants; the wording comes
 * from the string catalogue. Adding a seventh constant means touching those
 * two and nothing here.
 *
 * Repainting is not this component's business either. It calls `onApply`, and
 * PuzzleHost does what the theme switch already does: mark the palette stale
 * and rescale, which makes the mid-end redraw everything it has.
 */
export default function TuningPanel({
  onApply,
  dark,
}: {
  /** Ask whatever is on screen to run the rules again and redraw. */
  onApply: () => void
  /** The rules only rewrite the table on a dark board; say so if it is light. */
  dark: boolean
}) {
  const t = useStrings()
  // The source of truth is the module, not this state: `values` exists so
  // React re-renders the readouts, and is seeded from whatever is already set
  // so a remount shows where you left it.
  const [values, setValues] = useState<Tuning>({ ...tuning() })

  const put = useCallback(
    (next: Partial<Tuning>) => {
      setTuning(next)
      setValues({ ...tuning() })
      onApply()
    },
    [onApply],
  )

  const dirty = KNOBS.some((k) => values[k.key] !== TUNING_DEFAULTS[k.key])

  return (
    <aside className="tuning-rail" aria-label={t.tuning.title}>
      <div className="tuning-head">
        <h2>{t.tuning.title}</h2>
        <button
          type="button"
          className="tuning-reset-all"
          disabled={!dirty}
          onClick={() => put({ ...TUNING_DEFAULTS })}
        >
          {t.tuning.resetAll}
        </button>
      </div>

      <p className="tuning-lede">{t.tuning.subtitle}</p>
      {!dark && <p className="tuning-warn">{t.tuning.lightOnly}</p>}

      <div className="tuning-list">
        {KNOBS.map((knob) => {
          const copy = t.tuning.knobs[knob.key]
          const value = values[knob.key]
          const dflt = TUNING_DEFAULTS[knob.key]
          const [lo, hi] = knob.range
          const pct = (v: number) => ((v - lo) / (hi - lo)) * 100
          return (
            <div className="knob" key={knob.key}>
              <div className="knob-head">
                <span className="knob-name">{copy.name}</span>
                <code className="knob-key">{knob.key}</code>
                <output className="knob-value" data-off={value !== dflt}>
                  {value.toFixed(3)}
                </output>
                <button
                  type="button"
                  className="knob-reset"
                  disabled={value === dflt}
                  onClick={() => put({ [knob.key]: dflt } as Partial<Tuning>)}
                >
                  {t.tuning.reset}
                </button>
              </div>
              <p className="knob-what">{copy.what}</p>
              {/* The recommended span and the default are drawn on the track
                  rather than written beside it: the question a slider raises
                  is "am I inside it", and a mark answers that without being
                  read. */}
              <div className="knob-track">
                <span
                  className="knob-band"
                  style={{
                    left: `${pct(knob.band[0])}%`,
                    width: `${pct(knob.band[1]) - pct(knob.band[0])}%`,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="knob-default"
                  style={{ left: `${pct(dflt)}%` }}
                  aria-hidden="true"
                />
                <input
                  type="range"
                  min={lo}
                  max={hi}
                  step={knob.step}
                  value={value}
                  aria-label={copy.name}
                  aria-valuetext={String(value)}
                  onChange={(e) =>
                    put({ [knob.key]: Number(e.target.value) } as Partial<Tuning>)
                  }
                />
              </div>
              <p className="knob-ends">
                <span>
                  <b>&darr;</b> {copy.low}
                </span>
                <span>
                  <b>&uarr;</b> {copy.high}
                </span>
              </p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
