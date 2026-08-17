import Icon from './Icon'
import KeyPeg from './KeyPeg'
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
      ? key.paints.pencil
        ? t.keys.maybeRegion(key.value ?? 0)
        : t.keys.fillRegion(key.value ?? 0)
      : key.icon
        ? t.keys[key.icon]
        : key.slot !== undefined
          ? t.keys.peg(key.value ?? 0)
          : key.highlights
            ? t.keys.highlight(key.label ?? '')
            : undefined

  const { tip, holdToAsk, wasHeld } = useHoldTip()

  if (keys.length === 0) return null

  return (
    <>
      <div className="keypad" role="group" aria-label={t.play.keypad}>
        {/* React key 用下标、不用 key.button:我们这侧回答的键 button 全是 0,
            会互相撞 key;列表每次发牌整体重建、局内从不重排。 */}
        {keys.map((key, i) => {
          const said = describe(key)
          const count = countOn(key, left)
          const swatch =
            key.slot === undefined ? null : (
              <KeyPeg
                fill={swatches.get(key.slot)}
                ink={key.ink === undefined ? undefined : swatches.get(key.ink)}
                label={key.label}
                dotted={key.dotted}
              />
            )
          return (
            <button
              key={i}
              type="button"
              data-kind={key.kind}
              // 给 scripts/check-keys.mjs 用:键面上的 button 码要和上游
              // midend_request_keys() 报的那组对得上。app 内没有读者。
              data-button={key.button}
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
