import games from './games.json'
import PuzzleHost from './PuzzleHost'
import { onNavClick } from './router'

/**
 * A puzzle under the TypeScript rewrite. Every puzzle runs here as upstream's
 * compiled WebAssembly inside our own markup — the starting point the
 * TypeScript is to replace piece by piece.
 */
export default function GamePage({ name }: { name: string }) {
  const game = games.find((g) => g.name === name)

  if (!game) {
    return (
      <main className="game">
        <h1>Not found</h1>
        <p>
          There is no puzzle called “{name}”.{' '}
          <a href="/" onClick={onNavClick}>
            Back to the list
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
