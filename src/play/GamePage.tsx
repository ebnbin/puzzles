import PuzzleHost from './PuzzleHost'
import { fill, useStrings } from '../i18n'
import { useGame } from '../i18n/games'
import { showGallery } from '../view'

export default function GamePage({ name }: { name: string }) {
  const t = useStrings()
  const game = useGame(name)

  if (!game) {
    return (
      <main className="game">
        <h1>{t.notFound.title}</h1>
        <p>
          {fill(t.notFound.body, { name })}{' '}
          <button type="button" className="textlink" onClick={showGallery}>
            {t.notFound.back}
          </button>
        </p>
      </main>
    )
  }

  return (
    <PuzzleHost
      // key 不冗余:PuzzleHost 每次挂载只起一个后端,没有它 React 会复用已挂载
      // 的 host,换谜题后旧谜题原地留着。
      key={game.name}
      name={game.name}
      title={game.displayName}
      objective={game.objective}
    />
  )
}
