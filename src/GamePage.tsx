import PuzzleHost from './PuzzleHost'
import { Button } from '@/components/ui/button'
import { useStrings } from './i18n'
import { useGame } from './i18n/games'
import { showGallery } from './view'

export default function GamePage({ name }: { name: string }) {
  const t = useStrings()
  const game = useGame(name)

  if (!game) {
    return (
      <main className="py-8">
        <h1 className="mb-2 text-xl font-semibold">{t.notFound.title}</h1>
        <p>
          {t.notFound.body(name)}{' '}
          <Button variant="link" size="bare" onClick={showGallery}>
            {t.notFound.back}
          </Button>
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
