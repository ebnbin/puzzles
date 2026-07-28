import GamePage from './GamePage'
import Launcher from './Launcher'
import { usePath } from './router'

export default function App() {
  const path = usePath()
  const game = path.match(/^\/ts\/([a-z]+)\/?$/)

  return game ? <GamePage name={game[1]} /> : <Launcher />
}
