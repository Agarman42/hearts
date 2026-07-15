import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { publicUrl } from './assetUrl'
import { initPwaInstallListeners } from './pwaInstall'
import { watchPwaUpdates } from './pwaUpdate'
import './index.css'

initPwaInstallListeners()

// Public assets (textures, card back) must use BASE_URL so GitHub Pages
// project sites resolve correctly (./textures/... not /textures/...).
const rootStyle = document.documentElement.style
rootStyle.setProperty('--tex-wood', `url(${publicUrl('textures/wood.jpg')})`)
rootStyle.setProperty('--tex-damask', `url(${publicUrl('textures/damask.jpg')})`)
rootStyle.setProperty('--tex-card-back', `url(${publicUrl('cards/back.jpg')})`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Tiny SW so Chromium treats this as installable. Skip in dev — stale SW cache
// can serve broken bundles and cause a black screen on refresh.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => watchPwaUpdates(reg))
      .catch(() => {
        /* non-fatal: app still works without SW */
      })
  })
}
