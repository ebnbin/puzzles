// 方向键放哪一侧。默认关 = 放右边,和 --keys-w 那套几何无关——两侧只是把同一张
// 网格的两列对调,键的编号和顺序都不动。
import { makeFlag } from './flag'

export const [useLefty, setLefty] = makeFlag('puzzles.lefty')
