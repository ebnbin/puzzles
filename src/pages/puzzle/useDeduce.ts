// 推理键那一类的总开关,默认关。和 assist 分开是因为两者的来路不同:那一类
// 转发的是上游自己的键,这一类是我们自己推出来的答案(见 games/deduce/),
// 没有上游背书,得能单独关掉。
import { makeFlag } from '../../store'

export const [useDeduce, setDeduce] = makeFlag('puzzles.deduce')
