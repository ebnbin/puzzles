// 注册表的构建期不变量,vite.config.ts 在每次 build/dev 启动时跑。返回问题清单,空数组 = 全部
// 通过;报错文案要说清怎么修。
import { BACKGROUND } from '../../engine/palette'
import type { DialogControl } from '../../engine/types'
import { facts } from '../facts'
import type { Game, GameName } from '../game'

// facts 里录的偏好整表,拼成引擎会交来的控件样子,给构建期算一次 keypad 用。
type PrefFact =
  | { kind: 'boolean'; label: string; initial: boolean }
  | { kind: 'choices'; label: string; options: readonly string[]; initial: number }
const controlsOf = (name: GameName): DialogControl[] =>
  (facts[name].prefs as readonly PrefFact[]).map((p) =>
    p.kind === 'boolean'
      ? { kind: 'boolean', label: p.label, value: p.initial }
      : { kind: 'choices', label: p.label, choices: [...p.options], value: p.initial },
  )

export function verifyGames(
  // 注册表就是 Game<GameName, any>:F 逐游戏不同,这里只读申报组,不碰键。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  games: Readonly<Record<GameName, Game<GameName, any>>>,
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

  for (const [name, game] of Object.entries(games) as [GameName, Game<GameName, unknown>][]) {
    if (game.id !== name)
      bad.push(`${name} 的 id 写成了 ${game.id}:注册名就是身份,两处必须一致`)

    // 上游 request_keys 报出来的键,键区都得有:按默认那一局的参数算一遍 keypad;上游报空的
    // 游戏没有可核的。
    const wanted = facts[name].keys
    if (wanted.length) {
      const keys = game.keypad({ game: name, params: facts[name].params, prefs: controlsOf(name) })
      if (!keys) bad.push(`${name} 的 keypad() 认不出默认参数串 ${facts[name].params}`)
      const have = new Set((keys ?? []).map((k) => k.button))
      for (const { button, label } of wanted)
        if (!have.has(button))
          bad.push(`${name} 的键区缺上游 request_keys 报的 ${label ?? button}(button ${button}):补进 keypad()`)
    }

    const { dark } = game
    // dark 申报里的槽号不能超出引擎报的调色板(facts.colours 是 js_set_colour 录的)。
    const slots = facts[name].colours.length
    const referenced = [
      ...(dark.keep ?? []),
      ...(dark.relief ?? []).flat(),
      ...Object.entries(dark.frame ?? {}).flatMap(([k, v]) => [Number(k), v]),
      ...(dark.strokes ?? []),
    ]
    for (const slot of referenced)
      if (!Number.isInteger(slot) || slot < 0 || slot >= slots)
        bad.push(`${name} 的 dark 申报引用了 ${slot} 号槽,引擎的调色板只有 ${slots} 个`)
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
