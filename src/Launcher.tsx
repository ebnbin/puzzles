import games from './games.json'
import { gameHref, useEngine } from './engine'
import { onNavClick } from './router'

export default function Launcher() {
  const [engine, setEngine] = useEngine()
  const ts = engine === 'ts'

  return (
    <>
      <header>
        <h1>Simon Tatham's Portable Puzzle Collection</h1>
        <p>
          {games.length} puzzles, in the order they joined the collection.{' '}
          <a href="/doc/">Manual</a>
        </p>

        <label className="engine">
          <input
            type="checkbox"
            checked={ts}
            onChange={(e) => setEngine(e.target.checked ? 'ts' : 'wasm')}
          />
          <span className="engine-track" aria-hidden="true" />
          <span className="engine-label">
            TypeScript rewrite
            <em>{ts ? 'on — not implemented yet' : 'off — playing the original WebAssembly build'}</em>
          </span>
        </label>
      </header>

      <ul className="games">
        {games.map((game) => (
          <li key={game.name}>
            {/* Only the TypeScript route is ours to route; the WebAssembly
                pages are static files, so those links leave the app. */}
            <a
              href={gameHref(game.name, engine)}
              onClick={ts ? onNavClick : undefined}
            >
              <img
                src={`/icons/${game.name}.png`}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
              />
              <span className="games-text">
                <strong>{game.displayName}</strong>
                <span>{game.description}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <footer>
        <p>
          Puzzles are the work of Simon Tatham and contributors, distributed
          under the MIT licence. Source:{' '}
          <a href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/">
            chiark.greenend.org.uk
          </a>
        </p>
      </footer>
    </>
  )
}
