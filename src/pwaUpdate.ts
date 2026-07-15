const UPDATE_DISMISS_KEY = 'cutthroat.pwa-update.dismissed'

let updateWaiting = false
const updateListeners = new Set<() => void>()

function notifyUpdate() {
  for (const fn of updateListeners) fn()
}

export function onPwaUpdateReady(listener: () => void): () => void {
  updateListeners.add(listener)
  return () => updateListeners.delete(listener)
}

export function hasPwaUpdate(): boolean {
  return updateWaiting
}

export function isPwaUpdateDismissed(): boolean {
  try {
    return sessionStorage.getItem(UPDATE_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPwaUpdate(): void {
  try {
    sessionStorage.setItem(UPDATE_DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function applyPwaUpdate(): void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
}

/** Register for new service worker versions after initial registration. */
export function watchPwaUpdates(registration: ServiceWorkerRegistration): void {
  const track = (worker: ServiceWorker | null) => {
    if (!worker) return
    worker.addEventListener('statechange', () => {
      if (
        worker.state === 'installed' &&
        navigator.serviceWorker.controller &&
        !updateWaiting
      ) {
        updateWaiting = true
        notifyUpdate()
      }
    })
  }

  track(registration.installing)
  registration.addEventListener('updatefound', () => {
    track(registration.installing)
  })
}