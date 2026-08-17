// 下方区域:固定键在左、方向键块在右,位置写死,一辈子长一个样。键的内容和
// 格子号由 util/pad 拼装好交进来,这里只画。
import Icon from '../../ui/Icon'
import { useHoldTip } from '../../ui/HoldTip'
import { useStrings } from '../../i18n'
import type { PadButton } from '../../games/util/pad'

type Hold = ReturnType<typeof useHoldTip>

export default function PuzzleActions({
  pad,
  undo,
  redo,
  typesShown,
  typesEnabled,
  typesOpen,
  menuOpen,
  holdToAsk,
  wasHeld,
  onUndo,
  onRedo,
  onTypes,
  onMenu,
  onPress,
}: {
  pad: { rows: number; buttons: PadButton[] } | null
  undo: boolean
  redo: boolean
  typesShown: boolean
  typesEnabled: boolean
  typesOpen: boolean
  menuOpen: boolean
  holdToAsk: Hold['holdToAsk']
  wasHeld: Hold['wasHeld']
  onUndo(): void
  onRedo(): void
  onTypes(): void
  onMenu(): void
  onPress(key: PadButton): void
}) {
  const t = useStrings()

  const padKey = (key: PadButton, at: React.CSSProperties) => (
    <button
      key={key.slot}
      type="button"
      data-slot={key.slot}
      data-on={key.face.on || undefined}
      data-off={key.gone || undefined}
      data-brush={key.face.ring ? 'true' : undefined}
      style={at}
      disabled={key.face.dead}
      aria-pressed={key.face.held}
      aria-label={key.face.says}
      {...(key.face.tip && key.face.says ? holdToAsk(key.face.says) : {})}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (key.face.tip && wasHeld()) return
        onPress(key)
      }}
    >
      {'glyph' in key.face.art && <Icon name={key.face.art.glyph} />}
    </button>
  )

  const fixedKeys = (
    <div className="puzzle-acts">
      <button
        type="button"
        aria-label={t.play.undo}
        disabled={!undo}
        {...holdToAsk(t.play.undo)}
        onClick={() => {
          if (wasHeld()) return
          onUndo()
        }}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        aria-label={t.play.redo}
        disabled={!redo}
        {...holdToAsk(t.play.redo)}
        onClick={() => {
          if (wasHeld()) return
          onRedo()
        }}
      >
        <Icon name="redo" />
      </button>
      {/* 上游要等 wasm 起来才报得出预设,所以这个键先摆上、灰着,ready 之后才活:
          否则这一块会从三个键跳成四个,菜单键还跟着换一格。真的没有类型可选的
          游戏(npresets ≤ 1 且不能自定义,emcc.c 那时会撤掉整个下拉)才不画——
          那种游戏今天一个都没有,但 presets 的类型允许,不能当它不存在。 */}
      {typesShown && (
        <button
          type="button"
          aria-label={t.types.title}
          aria-haspopup="dialog"
          aria-expanded={typesOpen}
          disabled={!typesEnabled}
          {...holdToAsk(t.types.title)}
          onClick={() => {
            if (wasHeld()) return
            onTypes()
          }}
        >
          <Icon name="type" />
        </button>
      )}
      <button
        type="button"
        className="is-menu"
        aria-label={t.play.menu}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        {...holdToAsk(t.play.menu)}
        onClick={() => {
          if (wasHeld()) return
          onMenu()
        }}
      >
        <Icon name="menu" />
      </button>
    </div>
  )

  return (
    <nav className="puzzle-actions">
      {pad && pad.buttons.length > 0 ? (
        <div
          className="puzzle-keys"
          style={{ gridTemplateRows: `repeat(${pad.rows}, var(--tap-w))` }}
        >
          <div
            className="pad-floor"
            aria-hidden="true"
            style={{ gridRow: `1 / span ${pad.rows}` }}
          />
          {/* 固定键在左、方向键在右,所以 DOM 也这个顺序:tab 跟着屏幕从左到右走。
              display:contents 让方向键直接落进上面那张网格,同时留住那一层的 role
              和名字。一条渲染路径管所有键,摆哪儿由 util/pad 的格子号算好。
              方向键不给 tip:它要连着点,长按问一句会把连点打断。 */}
          {fixedKeys}
          <div className="puzzle-arrows" role="group" aria-label={t.play.arrows.group}>
            {pad.buttons.map((key) =>
              padKey(key, { gridRow: key.row, gridColumn: `c${key.col}` }),
            )}
          </div>
        </div>
      ) : (
        fixedKeys
      )}
    </nav>
  )
}
