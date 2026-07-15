const DISMISS_KEY = 'hearts.pwa-tip.dismissed'

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'installed'

/** Chromium deferred install prompt (not in all TS libs). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredInstall: BeforeInstallPromptEvent | null = null
const installListeners = new Set<() => void>()

function notifyInstallReady() {
  for (const fn of installListeners) fn()
}

export function onNativeInstallReady(listener: () => void): () => void {
  installListeners.add(listener)
  return () => installListeners.delete(listener)
}

export function canNativeInstall(): boolean {
  return deferredInstall != null
}

export async function promptNativeInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  const prompt = deferredInstall
  if (!prompt) return 'unavailable'
  try {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') deferredInstall = null
    return outcome
  } catch {
    deferredInstall = null
    return 'unavailable'
  }
}

/** Call once at app startup to capture Chromium's install prompt. */
export function initPwaInstallListeners(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstall = e as BeforeInstallPromptEvent
    notifyInstallReady()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstall = null
    notifyInstallReady()
  })
}

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
          'Tap Install below when available',
          'Or use the menu (⋮) → “Install app”',
          'One tap opens Cutthroat from your home screen',
        ],
      }
    default:
      return {
        title: 'Install on desktop',
        steps: [
          'Click Install below when available',
          'Or use the address bar install icon (⊕)',
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