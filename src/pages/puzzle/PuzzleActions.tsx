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
  dock,
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
  // 宽屏:面板停靠成侧栏,这两个键开的不是对话框,再按一次是收起。
  dock: boolean
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
        aria-label={t.puzzle.undo}
        disabled={!undo}
        {...holdToAsk(t.puzzle.undo)}
        onClick={() => {
          if (wasHeld()) return
          onUndo()
        }}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        aria-label={t.puzzle.redo}
        disabled={!redo}
        {...holdToAsk(t.puzzle.redo)}
        onClick={() => {
          if (wasHeld()) return
          onRedo()
        }}
      >
        <Icon name="redo" />
      </button>
      {/* 类型键先摆上、灰着,ready 之后才活(上游要等 wasm 起来才报得出预设)。npresets ≤ 1 且
          不能自定义的游戏才不画:今天一个都没有,但 presets 的类型允许。 */}
      {typesShown && (
        <button
          type="button"
          aria-label={t.types.title}
          aria-haspopup={dock ? undefined : 'dialog'}
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
        aria-label={t.puzzle.menu}
        aria-haspopup={dock ? undefined : 'dialog'}
        aria-expanded={menuOpen}
        {...holdToAsk(t.puzzle.menu)}
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
          {/* 固定键在左、方向键在右,DOM 也这个顺序。display:contents 让方向键直接落进上面那张
              网格,同时留住那一层的 role 和名字;摆哪儿由 util/pad 的格子号算好。方向键不给 tip:
              它要连着点。 */}
          {fixedKeys}
          <div className="puzzle-arrows" role="group" aria-label={t.puzzle.arrows.group}>
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
