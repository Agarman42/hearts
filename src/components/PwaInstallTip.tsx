import { useEffect, useMemo, useState } from 'react'
import {
  canNativeInstall,
  detectInstallPlatform,
  dismissPwaTip,
  installInstructions,
  isPwaTipDismissed,
  onNativeInstallReady,
  promptNativeInstall,
} from '../pwaInstall'
import './PwaInstallTip.css'

export function PwaInstallTip() {
  const platform = useMemo(() => detectInstallPlatform(), [])
  const [hidden, setHidden] = useState(
    () => platform === 'installed' || isPwaTipDismissed(),
  )
  const [nativeReady, setNativeReady] = useState(() => canNativeInstall())
  const [installing, setInstalling] = useState(false)

  useEffect(() => onNativeInstallReady(() => setNativeReady(canNativeInstall())), [])

  if (hidden || platform === 'installed') return null

  const { title, steps } = installInstructions(platform)
  const showNative = nativeReady && platform !== 'ios'

  const runInstall = async () => {
    setInstalling(true)
    const outcome = await promptNativeInstall()
    setInstalling(false)
    if (outcome === 'accepted') {
      dismissPwaTip()
      setHidden(true)
    }
  }

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
        {showNative && (
          <button
            type="button"
            className="btn btn--primary pwa-tip__install"
            disabled={installing}
            onClick={() => void runInstall()}
          >
            {installing ? 'Installing…' : 'Install Cutthroat'}
          </button>
        )}
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