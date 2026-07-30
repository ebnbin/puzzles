import PuzzleHost from './PuzzleHost'
import { useStrings } from './i18n'
import { useGame } from './i18n/games'
import { showGallery } from './view'

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
          <button type="button" className="textlink" onClick={showGallery}>
            {t.notFound.back}
          </button>
        </p>
      </main>
    )
  }

  return (
    // Keyed on the puzzle: switching from one to another has to build a new
    // one, and the host starts exactly one back end per mount. Without this
    // React would reuse the mounted host and the old puzzle would stay.
    <PuzzleHost
      key={game.name}
      name={game.name}
      title={game.displayName}
      objective={game.objective}
    />
  )
}
