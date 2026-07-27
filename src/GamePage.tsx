import games from './games.json'
import { gameHref } from './engine'
import PuzzleHost from './PuzzleHost'
import { onNavClick } from './router'

/**
 * A puzzle under the TypeScript rewrite. Where a rewrite has started, the
 * puzzle runs as upstream's compiled WebAssembly inside our own markup — the
 * starting point the TypeScript is to replace piece by piece.
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
    <main className="game">
      <nav>
        <a href="/" onClick={onNavClick}>
          ← All puzzles
        </a>
        <a href={gameHref(game.name, 'wasm')}>Compare with the original page</a>
      </nav>

      <h1>{game.displayName}</h1>
      <p className="objective">{game.objective}</p>

      {game.hasEngine ? (
        <PuzzleHost name={game.name} />
      ) : (
        <div className="board">
          <p>The rewrite has not started on this puzzle.</p>
        </div>
      )}
    </main>
  )
}
