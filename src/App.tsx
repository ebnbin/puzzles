import GamePage from './GamePage'
import Launcher from './Launcher'
import { usePath } from './router'
import { useTheme } from './useTheme'

export default function App() {
  const path = usePath()
  const game = path.match(/^\/ts\/([a-z]+)\/?$/)
  // Here rather than in the launcher: the listener that follows the system's
  // own setting has to outlive the screen the switch lives on, or a change made
  // while a puzzle is open would go unnoticed.
  const theme = useTheme()

  return game ? (
    <GamePage name={game[1]} />
  ) : (
    <Launcher theme={theme} />
  )
}
