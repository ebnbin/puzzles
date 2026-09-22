// assist 那一类的总开关。默认关。键名 puzzles.aid 已发布,只改过代码名。
import { makeFlag } from '../../store'

export const [useAssist, setAssist] = makeFlag('puzzles.aid')
