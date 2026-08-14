import Icon from './Icon'
import type { KeyArt, KeyGlyph, KeyIcon } from './Icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'
import { keycap } from './keycap'
import { HoldTip, useHoldTip } from './useHoldTip'
import { useResolvedTheme } from './useTheme'
import type { Resolved } from './useTheme'

const ART: readonly KeyArt[] = ['ghost', 'vampire', 'zombie']

const art = (icon: KeyIcon, theme: Resolved) =>
  (ART as readonly string[]).includes(icon) ? (
    <img
      className="block size-6"
      src={`/art/${icon}-${theme}.png`}
      alt=""
      width={24}
      height={24}
      draggable={false}
    />
  ) : (
    <Icon name={icon as KeyGlyph} />
  )

const peg = (
  key: KeyLabel,
  swatches: ReadonlyMap<number, string>,
  dead: boolean,
) => {
  const fill = key.slot === undefined ? undefined : swatches.get(key.slot)
  if (!fill) return null
  const ink = key.ink === undefined ? undefined : swatches.get(key.ink)
  return (
    <span
      className={cn(
        'grid size-[22px] place-items-center rounded-full border text-xs font-semibold leading-none tabular-nums',
        key.dotted &&
          '[background:radial-gradient(currentColor_1.6px,transparent_1.7px)_0_0/5px_5px]',
        dead && 'opacity-35',
      )}
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
      <div
        className="keypad relative z-[1] mx-auto flex max-h-[calc(3*var(--tap-w)+2*var(--key-gap)+0.3rem)] flex-none flex-wrap justify-center gap-(--key-gap) touch-pan-y overflow-y-auto overscroll-contain px-[0.4rem] pt-[0.3rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={t.play.keypad}
      >
        {/* React key 用下标、不用 key.button:我们这侧回答的键 button 全是 0,
            Map 的九个 swatch 会撞 key;列表每次发牌整体重建、局内从不重排。 */}
        {keys.map((key, i) => {
          const said = describe(key)
          const gone = dead(key)
          const count = countOn(key, left)
          const swatch = peg(key, swatches, gone)
          return (
            <Button
              key={i}
              size="bare"
              className={cn('relative size-10 text-[0.875rem] tabular-nums', keycap)}
              data-whose={key.whose}
              disabled={gone}
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
                <span
                  className="pointer-events-none absolute right-1 top-0.5 text-2xs font-medium leading-none tabular-nums text-muted-foreground"
                  aria-hidden="true"
                >
                  {count}
                </span>
              )}
            </Button>
          )
        })}
      </div>

      <HoldTip tip={tip} />
    </>
  )
}
