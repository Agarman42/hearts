import { useEffect, useState } from 'react'
import {
  applyPwaUpdate,
  dismissPwaUpdate,
  hasPwaUpdate,
  isPwaUpdateDismissed,
  onPwaUpdateReady,
} from '../pwaUpdate'
import './PwaInstallTip.css'

export function PwaUpdateTip() {
  const [visible, setVisible] = useState(
    () => hasPwaUpdate() && !isPwaUpdateDismissed(),
  )

  useEffect(
    () =>
      onPwaUpdateReady(() => {
        if (!isPwaUpdateDismissed()) setVisible(hasPwaUpdate())
      }),
    [],
  )

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return
    const reload = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', reload)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', reload)
  }, [])

  if (!visible) return null

  return (
    <aside className="pwa-tip pwa-tip--update" aria-label="App update available">
      <div className="pwa-tip__icon" aria-hidden>
        ↻
      </div>
      <div className="pwa-tip__body">
        <p className="pwa-tip__title">Update ready</p>
        <p className="pwa-tip__blurb">A newer version of Card Parlour is available.</p>
        <button
          type="button"
          className="btn btn--primary pwa-tip__install"
          onClick={() => {
            applyPwaUpdate()
            dismissPwaUpdate()
            setVisible(false)
          }}
        >
          Reload now
        </button>
      </div>
      <button
        type="button"
        className="pwa-tip__close"
        onClick={() => {
          dismissPwaUpdate()
          setVisible(false)
        }}
        aria-label="Dismiss update notice"
      >
        ×
      </button>
    </aside>
  )
}