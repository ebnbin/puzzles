import games from '../games.json'
import zh from '../games.zh.json'
import { useLang } from './index'
import type { Lang } from './index'

/**
 * What each puzzle is called and what it asks of you.
 *
 * The English is extracted from upstream's own `CMakeLists.txt` by
 * scripts/extract-games.mjs and is not written here; the Chinese is a
 * translation of exactly that, kept beside it.
 *
 * `displayName` is not translated in either direction. The puzzle names are
 * proper nouns — they are what the manual calls its chapters, what the game
 * ids are addressed by, and what upstream's own pages say.
 */

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
