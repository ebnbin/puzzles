// prefer 那一类的总开关。默认关:上游的偏好菜单里本来就有这些开关,键区上这一份
// 是快捷方式,不是唯一入口(判据见 docs/keys.md)。
import { makeFlag } from '../../store'

export const [usePrefer, setPrefer] = makeFlag('puzzles.prefer')
