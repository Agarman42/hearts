import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_NAME } from './appBrand'
import { canonicalUrl, joinSiteUrl, serviceWorkerScope, site } from './site'

describe('site address', () => {
  it('joins a GitHub Pages path and a root domain without doubled slashes', () => {
    expect(joinSiteUrl('https://agarman42.github.io', '/hearts/', '')).toBe(
      'https://agarman42.github.io/hearts/',
    )
    expect(joinSiteUrl('https://agarman42.github.io', '/hearts/', '/rules/euchre/')).toBe(
      'https://agarman42.github.io/hearts/rules/euchre/',
    )
    expect(joinSiteUrl('https://play.example', '/', 'rules/hearts/')).toBe(
      'https://play.example/rules/hearts/',
    )
  })

  it('scopes the service worker to the page directory on either host', () => {
    expect(serviceWorkerScope('https://agarman42.github.io/hearts/index.html')).toBe(
      'https://agarman42.github.io/hearts/',
    )
    expect(serviceWorkerScope('https://play.example/index.html')).toBe('https://play.example/')
  })

  it('uses one name and one public address', () => {
    expect(site.name).toBe(APP_NAME)
    expect(canonicalUrl()).toBe('https://agarman42.github.io/hearts/')
    expect(site.workerUrl).toBe('wss://cardparlour.cardparlour.workers.dev')
  })

  it('matches the published canonical links', () => {
    const pages = [
      ['index.html', canonicalUrl()],
      ['public/rules/hearts/index.html', canonicalUrl('rules/hearts/')],
      ['public/rules/spades/index.html', canonicalUrl('rules/spades/')],
      ['public/rules/euchre/index.html', canonicalUrl('rules/euchre/')],
      ['public/sitemap.xml', canonicalUrl()],
    ] as const
    for (const [file, url] of pages) {
      expect(readFileSync(file, 'utf8')).toContain(url)
    }
  })
})
