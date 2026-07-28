import Icon from './Icon'
import games from './games.json'
import { gameHref, useEngine } from './engine'
import { onNavClick } from './router'

/**
 * The gallery.
 *
 * Forty thumbnails rendered from the positions upstream chose are the best
 * thing this app has to show, so they are the thing it shows: art first, at
 * the size of a tile rather than of a favicon, on the collection's own grey so
 * each one bleeds to its edges. Names like Twiddle and Flip tell you nothing
 * on their own, so the description stays.
 */
export default function Launcher() {
  const [engine, setEngine] = useEngine()
  const ts = engine === 'ts'

  return (
    <div className="launcher">
      <header className="masthead">
        <p className="masthead-eyebrow">Simon Tatham’s</p>
        <h1>Portable Puzzle Collection</h1>
        <p className="masthead-meta">
          {games.length} puzzles, in the order they joined the collection
          <a className="textlink" href="/doc/">
            Manual
            <Icon name="external" size={14} />
          </a>
        </p>
      </header>

      <label className="engine">
        <input
          type="checkbox"
          checked={ts}
          onChange={(e) => setEngine(e.target.checked ? 'ts' : 'wasm')}
        />
        <span className="engine-text">
          TypeScript rewrite
          <em>
            {ts
              ? 'On — React hosts the menus, input and drawing'
              : 'Off — upstream’s own WebAssembly pages, untouched'}
          </em>
        </span>
        <span className="engine-track" aria-hidden="true">
          <span className="engine-knob" />
        </span>
      </label>

      <ul className="games">
        {games.map((game) => (
          <li key={game.name}>
            {/* Only the TypeScript route is ours to route; the WebAssembly
                pages are static files, so those links leave the app. */}
            <a
              href={gameHref(game.name, engine)}
              onClick={ts ? onNavClick : undefined}
            >
              <span className="games-art">
                <img
                  src={`/icons/${game.name}.png`}
                  alt=""
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <strong>{game.displayName}</strong>
              <span className="games-desc">{game.description}</span>
            </a>
          </li>
        ))}
      </ul>

      <footer>
        <p>
          Puzzles are the work of Simon Tatham and contributors, distributed
          under the MIT licence. Source:{' '}
          <a
            className="textlink"
            href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/"
          >
            chiark.greenend.org.uk
            <Icon name="external" size={14} />
          </a>
        </p>
      </footer>
    </div>
  )
}
