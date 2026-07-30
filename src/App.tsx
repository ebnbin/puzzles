import GamePage from './GamePage'
import Launcher from './Launcher'
import { useView } from './view'

/**
 * The whole app: the gallery, or one puzzle over it. Which, is a variable —
 * see view.ts.
 */
export default function App() {
  const game = useView()
  return game ? <GamePage name={game} /> : <Launcher />
}
