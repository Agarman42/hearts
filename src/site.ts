/**
 * The public address. Vite's base stays `./`, and the service worker is
 * registered from that relative URL, so the same build works on GitHub Pages
 * (`/hearts/`) and on a root domain (`/`).
 *
 * When a domain is bought, change `origin` and `basePath` here. Use
 * `basePath: '/'` for a root domain. The HTML canonical links have to match;
 * `src/site.test.ts` names the files.
 */
export const site = {
  name: 'Card Parlour',
  origin: 'https://agarman42.github.io',
  basePath: '/hearts/',
  workerUrl: 'wss://cardparlour.cardparlour.workers.dev',
} as const

export function joinSiteUrl(origin: string, basePath: string, path = ''): string {
  const base = basePath.startsWith('/') ? basePath : `/${basePath}`
  const prefix = base.endsWith('/') ? base : `${base}/`
  const rest = path.replace(/^\/+/, '')
  return `${origin}${prefix}${rest}`
}

export function canonicalUrl(path = ''): string {
  return joinSiteUrl(site.origin, site.basePath, path)
}

/** Default scope of a service worker registered as `sw.js` next to the page. */
export function serviceWorkerScope(pageUrl: string): string {
  return new URL('./', new URL('sw.js', pageUrl)).href
}
