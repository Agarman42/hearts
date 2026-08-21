/**
 * Stable visible height for phones that lack dvh/svh, and for iOS Safari
 * where 100vh includes the area under the browser chrome.
 *
 * Set once per load / orientation — not on every URL-bar hide — so the
 * trick pile does not jump mid-hand.
 */
export function installViewportHeight(): void {
  const root = document.documentElement

  const apply = () => {
    const h =
      window.visualViewport?.height && window.visualViewport.height > 0
        ? Math.round(window.visualViewport.height)
        : window.innerHeight
    if (h > 0) root.style.setProperty('--app-height', `${h}px`)
  }

  apply()
  window.addEventListener('orientationchange', () => {
    window.setTimeout(apply, 250)
  })
  window.addEventListener('pageshow', apply)
}
