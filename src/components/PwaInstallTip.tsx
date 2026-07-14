import { useMemo, useState } from 'react'
import {
  detectInstallPlatform,
  dismissPwaTip,
  installInstructions,
  isPwaTipDismissed,
} from '../pwaInstall'
import './PwaInstallTip.css'

export function PwaInstallTip() {
  const platform = useMemo(() => detectInstallPlatform(), [])
  const [hidden, setHidden] = useState(
    () => platform === 'installed' || isPwaTipDismissed(),
  )

  if (hidden || platform === 'installed') return null

  const { title, steps } = installInstructions(platform)

  return (
    <aside className="pwa-tip" aria-label="Install this app">
      <div className="pwa-tip__icon" aria-hidden>
        {platform === 'ios' ? '📲' : platform === 'android' ? '📱' : '💻'}
      </div>
      <div className="pwa-tip__body">
        <p className="pwa-tip__title">{title}</p>
        <ol className="pwa-tip__steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <button
        type="button"
        className="pwa-tip__close"
        onClick={() => {
          dismissPwaTip()
          setHidden(true)
        }}
        aria-label="Dismiss install tip"
      >
        ×
      </button>
    </aside>
  )
}