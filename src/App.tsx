import games from './games.json'

export default function App() {
  return (
    <>
      <header>
        <h1>Simon Tatham's Portable Puzzle Collection</h1>
        <p>
          {games.length} puzzles compiled to WebAssembly, running unmodified.{' '}
          <a href="/doc/">Manual</a>
        </p>
      </header>

      <ul className="games">
        {games.map((game) => (
          <li key={game.name}>
            <a href={`/games/${game.name}.html`}>
              <strong>{game.displayName}</strong>
              <span>{game.description}</span>
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
