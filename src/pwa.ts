const DISMISS_KEY = 'hearts.pwa-tip.dismissed'

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'installed'

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function detectInstallPlatform(): InstallPlatform {
  if (isStandalonePwa()) return 'installed'
  if (typeof window === 'undefined') return 'desktop'

  const ua = window.navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'

  const isAndroid = /Android/i.test(ua)
  if (isAndroid) return 'android'

  return 'desktop'
}

export function installInstructions(platform: InstallPlatform): {
  title: string
  steps: string[]
} {
  switch (platform) {
    case 'ios':
      return {
        title: 'Add to Home Screen',
        steps: [
          'Tap Share (↑) in Safari',
          'Choose “Add to Home Screen”',
          'Tap Add — plays full-screen like an app',
        ],
      }
    case 'android':
      return {
        title: 'Install the app',
        steps: [
          'Tap the menu (⋮) in Chrome',
          'Choose “Install app” or “Add to Home screen”',
          'Confirm — one tap opens Hearts from your home screen',
        ],
      }
    default:
      return {
        title: 'Install on desktop',
        steps: [
          'Look for the install icon (⊕) in the address bar',
          'Or open the browser menu → “Install Hearts…”',
          'Launches in its own window, no browser chrome',
        ],
      }
  }
}

export function isPwaTipDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPwaTip(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}