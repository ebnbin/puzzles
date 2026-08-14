import GamePage from './GamePage'
import Launcher from './Launcher'
import { useView } from './view'

export default function App() {
  const game = useView()
  return game ? <GamePage name={game} /> : <Launcher />
}
