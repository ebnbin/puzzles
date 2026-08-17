import DocViewer from './doc/DocViewer'
import GamePage from './play/GamePage'
import Launcher from './launcher/Launcher'
import { useView } from './view'

export default function App() {
  const game = useView()
  return (
    <>
      {game ? <GamePage name={game} /> : <Launcher />}
      <DocViewer />
    </>
  )
}
