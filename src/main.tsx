import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installDemoFromUrl } from './game/demo/installDemo.ts'

// "?demo" in the address bar sets the demonstration person up before anything reads the
// stores, so a browser that has never run LOOM opens straight into a console with history
// behind it instead of an empty one.
installDemoFromUrl()

// Offline support: the whole village is generated in code, so caching the built
// bundle makes the game fully playable with no connection.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is a bonus; the app works fine without it */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
