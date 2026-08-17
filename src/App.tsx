import Manual from './pages/manual/Manual'
import Puzzle from './pages/puzzle/Puzzle'
import Gallery from './pages/gallery/Gallery'
import { useView } from './view'

export default function App() {
  const game = useView()
  return (
    <>
      {game ? <Puzzle name={game} /> : <Gallery />}
      <Manual />
    </>
  )
}
