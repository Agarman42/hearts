import { APP_BUILD } from './appVersion'

import { APP_SLUG } from './appBrand'

const UPDATE_DISMISS_KEY = `${APP_SLUG}.pwa-update.dismissed-build`

let updateWaiting = false
let pendingRegistration: ServiceWorkerRegistration | null = null
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
    return localStorage.getItem(UPDATE_DISMISS_KEY) === APP_BUILD
  } catch {
    return false
  }
}

export function dismissPwaUpdate(): void {
  try {
    localStorage.setItem(UPDATE_DISMISS_KEY, APP_BUILD)
  } catch {
    /* ignore */
  }
}

export function applyPwaUpdate(): void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return

  const activate = (worker: ServiceWorker | null | undefined) => {
    if (!worker) return false
    worker.postMessage({ type: 'SKIP_WAITING' })
    return true
  }

  if (activate(pendingRegistration?.waiting)) {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.location.reload()
      },
      { once: true },
    )
    return
  }

  void navigator.serviceWorker.getRegistration().then((reg) => {
    if (activate(reg?.waiting)) {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.location.reload()
        },
        { once: true },
      )
      return
    }
    // Fallback: controller may already be the new worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  })
}

/** Register for new service worker versions after initial registration. */
export function watchPwaUpdates(registration: ServiceWorkerRegistration): void {
  pendingRegistration = registration

  const track = (worker: ServiceWorker | null) => {
    if (!worker) return
    worker.addEventListener('statechange', () => {
      if (
        worker.state === 'installed' &&
        navigator.serviceWorker.controller &&
        !updateWaiting
      ) {
        pendingRegistration = registration
        updateWaiting = true
        notifyUpdate()
      }
    })
  }

  track(registration.installing)
  if (registration.waiting && navigator.serviceWorker.controller) {
    updateWaiting = true
    notifyUpdate()
  }
  registration.addEventListener('updatefound', () => {
    track(registration.installing)
  })
}
