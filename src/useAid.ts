// 四类(辅助)键的总开关。默认关,和方向键那个一样是选进来的:提示、铺标记这些
// 一局不用照样玩得完(判据见 docs/keys.md),默认的键盘只留必要键。
import { makeFlag } from './flag'

export const [useAid, setAid] = makeFlag('puzzles.aid')
