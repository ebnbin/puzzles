import PuzzleHost from './PuzzleHost'
import { useStrings } from './i18n'
import { useGame } from './i18n/games'
import { showGallery } from './view'

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
    <PuzzleHost
      key={game.name}
      name={game.name}
      title={game.displayName}
      objective={game.objective}
    />
  )
}
