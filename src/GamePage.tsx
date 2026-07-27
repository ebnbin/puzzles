import games from './games.json'
import { gameHref } from './engine'
import { onNavClick } from './router'

/**
 * Shell for a puzzle under the TypeScript rewrite. No puzzle is implemented
 * yet; this is the frame they will render into.
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
        <a href={gameHref(game.name, 'wasm')}>Play the WebAssembly build</a>
      </nav>

      <h1>{game.displayName}</h1>
      <p className="objective">{game.objective}</p>

      {/* The board mounts here once this puzzle is rewritten. */}
      <div className="board" role="presentation">
        <p>Not implemented yet</p>
      </div>

      <div className="controls">
        <button type="button" disabled>New game</button>
        <button type="button" disabled>Restart</button>
        <button type="button" disabled>Undo</button>
        <button type="button" disabled>Redo</button>
      </div>

      <p className="status" />
    </main>
  )
}
