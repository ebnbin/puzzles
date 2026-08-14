import games from '../games.json'
import zh from '../games.zh.json'
import { useLang } from './index'
import type { Lang } from './index'

export type GameText = {
  name: string
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
