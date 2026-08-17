import type { Face, Key, View } from '../games/game'
import { fill, useStrings } from '../i18n'
import HoldTip, { useHoldTip } from '../ui/HoldTip'
import Icon from '../ui/Icon'
import type { IconName } from '../ui/Icon'
import Swatch from '../ui/Swatch'
import { useResolvedTheme } from '../useTheme'
import type { Resolved } from '../useTheme'

// group → data-kind 的旧词:CSS 和 check-keys.mjs 按 need/pick/aid 认,
// 这三个词已随样式表发布,别跟着接口改名。
const KIND = { entry: 'need', pick: 'pick', assist: 'aid' } as const

const art = (name: string, theme: Resolved) =>
  name === 'ghost' || name === 'vampire' || name === 'zombie' ? (
    <img
      className="key-art"
      src={`/art/${name}-${theme}.png`}
      alt=""
      width={24}
      height={24}
      draggable={false}
    />
  ) : (
    <Icon name={name as IconName} />
  )

export default function PuzzleKeypad({
  keys,
  view,
  swatches,
  onPress,
}: {
  keys: Key<unknown>[]
  view: View<unknown>
  swatches: ReadonlyMap<number, string>
  onPress: (key: Key<unknown>) => void
}) {
  const t = useStrings()
  const theme = useResolvedTheme()

  // 词条只有键面说不出自己时才由这里派生:字形/图片按名字查 t.keys,
  // 字面键靠角标句式;别的说法(色钉、高亮)由 face.says 自带。
  const worded = (name: string) => {
    const entry = (t.keys as Record<string, unknown>)[name]
    return typeof entry === 'string' ? entry : undefined
  }

  const { tip, holdToAsk, wasHeld } = useHoldTip()

  if (keys.length === 0) return null

  return (
    <>
      <div className="keypad" role="group" aria-label={t.play.keypad}>
        {/* React key 用下标:列表每次发牌整体重建、局内从不重排。 */}
        {keys.map((key, i) => {
          const face: Face =
            typeof key.face === 'function' ? key.face(view) : key.face
          const count = key.count ? key.count(view.facts) : null
          const said =
            face.says ??
            ('glyph' in face.art
              ? worded(face.art.glyph)
              : 'image' in face.art
                ? worded(face.art.image)
                : undefined)
          const label =
            'text' in face.art
              ? face.art.text
              : 'swatch' in face.art
                ? (face.art.swatch.label ?? '')
                : null
          const swatch =
            'swatch' in face.art ? (
              <Swatch
                fill={swatches.get(face.art.swatch.fill)}
                ink={
                  face.art.swatch.edge === undefined
                    ? undefined
                    : swatches.get(face.art.swatch.edge)
                }
                label={face.art.swatch.label}
                dotted={face.art.swatch.dotted}
              />
            ) : null
          return (
            <button
              key={i}
              type="button"
              data-kind={KIND[key.group]}
              // 给 scripts/check-keys.mjs 用:键面上的 button 码要和上游
              // midend_request_keys() 报的那组对得上。app 内没有读者。
              data-button={key.button ?? 0}
              disabled={face.dead}
              aria-label={
                said ?? (count !== null ? fill(t.keys.left, { digit: label ?? '', count }) : undefined)
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
                ('glyph' in face.art || 'image' in face.art
                  ? art('glyph' in face.art ? face.art.glyph : face.art.image, theme)
                  : label)}
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
