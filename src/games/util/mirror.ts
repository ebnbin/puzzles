// 光标位置的镜像:夹边、不绕回,和上游 move_cursor 的非环绕语义一致。
// 只是几何,不认识任何游戏;记不记、怎么用由游戏文件决定。
export type Spot = { x: number; y: number }

export function stepCursor(
  at: Spot,
  key: string,
  grid: { w: number; h: number },
): Spot {
  const { x, y } = at
  switch (key) {
    case 'ArrowLeft': return { x: Math.max(x - 1, 0), y }
    case 'ArrowRight': return { x: Math.min(x + 1, grid.w - 1), y }
    case 'ArrowUp': return { x, y: Math.max(y - 1, 0) }
    case 'ArrowDown': return { x, y: Math.min(y + 1, grid.h - 1) }
    default: return at
  }
}
