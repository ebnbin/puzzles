import PuzzleHost from './PuzzleHost'
import { useStrings } from './i18n'
import { useGame } from './i18n/games'
import { onNavClick } from './router'

/**
 * A puzzle under the TypeScript rewrite. Every puzzle runs here as upstream's
 * compiled WebAssembly inside our own markup — the starting point the
 * TypeScript is to replace piece by piece.
 */
export default function GamePage({ name }: { name: string }) {
  const t = useStrings()
  const game = useGame(name)

  if (!game) {
    return (
      <main className="game">
        <h1>{t.notFound.title}</h1>
        <p>
          {t.notFound.body(name)}{' '}
          <a href="/" onClick={onNavClick}>
            {t.notFound.back}
          </a>
        </p>
      </main>
    )
  }

  return (
    <PuzzleHost
      name={game.name}
      title={game.displayName}
      objective={game.objective}
    />
  )
}
