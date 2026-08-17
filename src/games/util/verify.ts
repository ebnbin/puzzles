// 注册表的构建期不变量,vite.config.ts 在每次 build/dev 启动时跑(原
// scripts/verify-palette.mjs 的继任:表搬进了四十个游戏文件,检查跟着搬)。
// 返回问题清单,空数组 = 全部通过;报错文案要说清怎么修,不只说错了。
import { BACKGROUND } from '../../engine/palette'
import type { Game, GameName } from '../game'

export function verifyGames(
  // 注册表就是 Game<any>:F 逐游戏不同,这里只读申报组,不碰键。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  games: Readonly<Record<GameName, Game<any>>>,
  published: readonly { name: string }[],
): string[] {
  const bad: string[] = []

  const registered = new Set(Object.keys(games))
  for (const { name } of published)
    if (!registered.has(name))
      bad.push(`games.json 有 ${name},注册表没有:补一个 src/games/${name}.ts`)
  for (const name of registered)
    if (!published.some((g) => g.name === name))
      bad.push(`注册表有 ${name},games.json 没有:它不是上游收录的游戏`)

  for (const [name, game] of Object.entries(games)) {
    if (game.id !== name)
      bad.push(`${name} 的 id 写成了 ${game.id}:注册名就是身份,两处必须一致`)

    const { dark } = game
    if (dark.paper && dark.relief)
      bad.push(
        `${name} 既转纸面(paper)又有亮影对(relief):棋盘抬走了,浮雕留在原地。` +
          `恢复搬运 pass,或说明这一个为什么不需要。`,
      )
    for (const [fill, rim] of Object.entries(dark.frame ?? {}).map(
      ([k, v]) => [Number(k), v] as const,
    )) {
      if (!dark.keep?.includes(fill))
        bad.push(
          `${name} 的 frame[${fill}] 不是 keep 里的槽:它会被翻转,出来就是浅色,不需要借描边`,
        )
      if (!dark.keep?.includes(rim))
        bad.push(
          `${name} 的 frame[${fill}] 借了 ${rim} 号槽,而 keep 不持有它:借来的颜色不稳定`,
        )
    }
    if (dark.strokes) {
      if (!dark.strokes.includes(BACKGROUND))
        bad.push(
          `${name} 的 strokes 不含背景槽 ${BACKGROUND}:这个申报的判据是「画的纸面就是底色」,` +
            `没有它这条申报另有原因,而原因没写出来`,
        )
      if (dark.strokes.length < 2)
        bad.push(
          `${name} 的 strokes 只有纸没有墨:纸独自是半张底片,墨翻过去画就没了线条`,
        )
    }
  }

  return bad
}
