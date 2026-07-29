import GamePage from './GamePage'
import Launcher from './Launcher'
import { usePath } from './router'

/**
 * A puzzle lives at its bare name — /solo — and the launcher at the root.
 * Anything else with a path in it is a real file the server owns: the manual
 * under /doc/, and upstream's own pages under /games/, which have no link
 * from in here but answer at their old addresses all the same.
 */
export default function App() {
  const path = usePath()
  const game = path.match(/^\/([a-z]+)\/?$/)

  return game ? <GamePage name={game[1]} /> : <Launcher />
}
