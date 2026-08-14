import Icon from './Icon'
import type { KeyArt, KeyGlyph, KeyIcon } from './Icon'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'
import { HoldTip, useHoldTip } from './useHoldTip'
import { useResolvedTheme } from './useTheme'
import type { Resolved } from './useTheme'

const ART: readonly KeyArt[] = ['ghost', 'vampire', 'zombie']

const art = (icon: KeyIcon, theme: Resolved) =>
  (ART as readonly string[]).includes(icon) ? (
    <img
      className="key-art"
      src={`/art/${icon}-${theme}.png`}
      alt=""
      width={24}
      height={24}
      draggable={false}
    />
  ) : (
    <Icon name={icon as KeyGlyph} />
  )

const peg = (key: KeyLabel, swatches: ReadonlyMap<number, string>) => {
  const fill = key.slot === undefined ? undefined : swatches.get(key.slot)
  if (!fill) return null
  const ink = key.ink === undefined ? undefined : swatches.get(key.ink)
  return (
    <span
      className="key-peg"
      data-dotted={key.dotted ? '' : undefined}
      style={{
        [key.dotted ? 'color' : 'background']: fill,
        borderColor: ink ?? 'transparent',
        ...(key.dotted ? {} : { color: ink }),
      }}
    >
      {key.label}
    </span>
  )
}

const countOn = (key: KeyLabel, left: Map<number, number> | null) => {
  if (key.value === undefined || !left) return null
  const n = left.get(key.value)
  return n !== undefined && n > 0 ? n : null
}

export default function PuzzleKeypad({
  keys,
  left,
  swatches,
  dead,
  onPress,
}: {
  keys: KeyLabel[]
  left: Map<number, number> | null
  swatches: ReadonlyMap<number, string>
  dead: (key: KeyLabel) => boolean
  onPress: (key: KeyLabel) => void
}) {
  const t = useStrings()
  const theme = useResolvedTheme()

  const describe = (key: KeyLabel) =>
    key.paints
      ? key.paints.colour < 0
        ? t.keys.clearRegion
        : key.paints.pencil
          ? t.keys.maybeRegion(key.paints.colour + 1)
          : t.keys.fillRegion(key.paints.colour + 1)
      : key.icon
        ? t.keys[key.icon]
        : key.slot !== undefined
          ? t.keys.peg(key.value ?? 0)
          : key.whose
            ? t.keys.highlight(key.label ?? '')
            : undefined

  const { tip, holdToAsk, wasHeld } = useHoldTip()

  if (keys.length === 0) return null

  return (
    <>
      <div className="keypad" role="group" aria-label={t.play.keypad}>
        {/* React key 用下标、不用 key.button:我们这侧回答的键 button 全是 0,
            Map 的九个 swatch 会撞 key;列表每次发牌整体重建、局内从不重排。 */}
        {keys.map((key, i) => {
          const said = describe(key)
          const count = countOn(key, left)
          const swatch = peg(key, swatches)
          return (
            <button
              key={i}
              type="button"
              data-whose={key.whose}
              disabled={dead(key)}
              aria-label={
                key.icon || key.slot !== undefined
                  ? said
                  : count !== null
                    ? t.keys.left(key.label ?? '', count)
                    : undefined
              }
              title={said}
              // 让焦点留在棋盘上:谜题从棋盘读键盘,按钮拿到焦点会吞方向键。
              onMouseDown={(e) => e.preventDefault()}
              {...holdToAsk(said)}
              onClick={() => {
                if (wasHeld()) return
                onPress(key)
              }}
            >
              {swatch ??
                (key.icon
                  ? art(key.icon, theme)
                  : (key.label ?? String.fromCharCode(key.button)))}
              {count !== null && (
                <span className="key-left" aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <HoldTip tip={tip} />
    </>
  )
}
