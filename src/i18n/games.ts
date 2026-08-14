import games from '../games.json'
import zh from '../games.zh.json'
import { useLang } from './index'
import type { Lang } from './index'

export type GameText = {
  name: string
  // 双向都不翻译:谜题名是专有名词,手册章节、game id、上游页面都用它;
  // 往 games.zh.json 补 displayName 会让画廊名字与手册和 ID 失联。
  displayName: string
  description: string
  objective: string
}

const OVERRIDES: Record<string, { description: string; objective: string }> = zh

function localise(game: (typeof games)[number], lang: Lang): GameText {
  const override = lang === 'zh' ? OVERRIDES[game.name] : undefined
  return override ? { ...game, ...override } : game
}

export function useGames(): GameText[] {
  const [lang] = useLang()
  return games.map((game) => localise(game, lang))
}

export function useGame(name: string): GameText | undefined {
  const [lang] = useLang()
  const game = games.find((g) => g.name === name)
  return game && localise(game, lang)
}
