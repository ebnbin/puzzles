import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { readPlaying, readRecent, setPlaying } from './engine/saves'
import games from './games.json'
import './index.css'
import { start } from './view'

{
  const playing = readPlaying()
  const recent = readRecent()
  const target =
    playing && recent && games.some((g) => g.name === recent) ? recent : null
  if (playing && !target) setPlaying(false)
  start(target)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('service worker registration failed', error)
    })

  })
}
