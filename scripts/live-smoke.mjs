import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'https://agarman42.github.io/hearts/'
const OUT = '/tmp/live-smoke'
const VERSION = process.env.SMOKE_VERSION ?? '0.3.72'
mkdirSync(OUT, { recursive: true })

async function skip(page) {
  const b = page.getByRole('button', { name: 'Skip tips' })
  if (await b.isVisible().catch(() => false)) await b.click()
}

async function tap(page) {
  const hit = page.locator('.table-hand .hand__hit:not([disabled])').first()
  if ((await hit.count()) === 0) return false
  await hit.focus()
  await page.keyboard.press('Enter')
  return true
}

async function playUntilTrick(page, label) {
  const t0 = Date.now()
  while (Date.now() - t0 < 50_000) {
    if ((await page.locator('.trick__anchor').count()) > 0) {
      await page.screenshot({ path: `${OUT}/${label}-trick.png` })
      console.log(label, 'trick')
      return
    }
    await skip(page)
    const pass = page.getByRole('button', { name: /Pass Left|Pass Right|Pass Across|Keep your cards|Add to hand/ })
    if (await pass.first().isEnabled().catch(() => false)) {
      const text = await pass.first().innerText()
      if (text.startsWith('Pass')) {
        for (let i = 0; i < 3; i++) {
          const slot = page.locator('.hand__slot').nth(i)
          if (await slot.count()) await slot.click({ force: true })
        }
      }
      await pass.first().click()
      continue
    }
    const lock = page.getByRole('button', { name: /Lock in/ })
    if (await lock.isEnabled().catch(() => false)) {
      await lock.click()
      continue
    }
    const order = page.getByRole('button', { name: /^(Order up|Pick up|Pass)$/ })
    if (await order.first().isEnabled().catch(() => false)) {
      await order.first().click()
      continue
    }
    if (await page.getByRole('form', { name: 'Loner choice' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'With partner' }).click()
      continue
    }
    if (await page.getByRole('region', { name: 'Dealer discard' }).isVisible().catch(() => false)) {
      await tap(page)
      continue
    }
    if (await page.getByRole('heading', { name: 'Name trump' }).isVisible().catch(() => false)) {
      const suit = page.getByRole('button', { name: /Name \w+ trump/ }).first()
      if (await suit.isEnabled().catch(() => false)) await suit.click()
      continue
    }
    if (await tap(page)) continue
    await page.waitForTimeout(120)
  }
  await page.screenshot({ path: `${OUT}/${label}-FAIL.png` })
  throw new Error(label + ' no trick')
}

async function leaveLobby(page) {
  const leave = page.getByRole('button', { name: /Leave/ }).first()
  await leave.click()
  await page.getByRole('heading', { name: 'Card Parlour' }).waitFor({ timeout: 15000 })
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
page.setDefaultTimeout(15000)

let version = ''
for (let i = 0; i < 8; i++) {
  await page.goto(BASE + '?smoke=' + Date.now(), { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Card Parlour' }).waitFor()
  const versionLoc = page.locator('.home__version')
  await versionLoc.scrollIntoViewIfNeeded().catch(() => {})
  version = (await versionLoc.innerText().catch(() => '')).trim()
  console.log('try', i, version)
  if (version.includes(VERSION)) break
  await page.waitForTimeout(4000)
}
if (!version.includes(VERSION)) throw new Error('stale version ' + version)
await page.screenshot({ path: `${OUT}/home-390.png` })
console.log('version390', version)
await page.setViewportSize({ width: 1280, height: 800 })
await page.locator('.home__version').scrollIntoViewIfNeeded()
console.log('version1280', await page.locator('.home__version').innerText())
await page.screenshot({ path: `${OUT}/home-1280.png` })

await page.setViewportSize({ width: 390, height: 844 })
await page.getByRole('button', { name: 'Settings' }).first().click()
await page.getByRole('radio', { name: /Instant/i }).click()
await page.getByRole('button', { name: /Back/i }).click()

await page.locator('.home__game-tile--hearts').click()
await page.getByRole('heading', { name: 'Pass three' }).waitFor({ timeout: 15000 })
await playUntilTrick(page, 'hearts')

async function homeThen(page, tile) {
  await skip(page)
  const menu = page.getByRole('button', { name: 'Menu' })
  if (await menu.isVisible().catch(() => false)) {
    await menu.click()
    await page.getByRole('button', { name: /Home/i }).first().click()
  }
  await page.getByRole('heading', { name: 'Card Parlour' }).waitFor({ timeout: 15000 })
  await page.locator(tile).click()
  const dialog = page.getByRole('dialog')
  if (await dialog.isVisible().catch(() => false)) {
    const neu = dialog.getByRole('button', { name: 'New table' })
    if (await neu.isVisible().catch(() => false)) await neu.click()
  }
  await skip(page)
  await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20000 })
}

await homeThen(page, '.home__game-tile--spades')
await playUntilTrick(page, 'spades')
await homeThen(page, '.home__game-tile--euchre')
await playUntilTrick(page, 'euchre')

const hostCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const guestCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const host = await hostCtx.newPage()
const guest = await guestCtx.newPage()
host.setDefaultTimeout(20000)
guest.setDefaultTimeout(20000)
await host.goto(BASE, { waitUntil: 'domcontentloaded' })
await host.getByRole('button', { name: 'Host friends table' }).click()
await host.locator('.home-confirm__card').getByRole('button', { name: /Hearts/ }).click()
await host.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
await host.getByLabel('Your name at the table').fill('Ada')
await host.getByRole('button', { name: 'Sit down' }).click()
await host.locator('.friends-lobby__code').waitFor()
const code = (await host.locator('.friends-lobby__code').innerText()).replace(/\s/g, '')
console.log('live room', code)
await host.screenshot({ path: `${OUT}/lobby-host-390.png` })
await guest.goto(`${BASE}?room=${code}&game=hearts`, { waitUntil: 'domcontentloaded' })
await guest.getByLabel('Your name at the table').fill('Bea')
await guest.getByRole('button', { name: 'Sit down' }).click()
await guest.locator('.friends-lobby__code').waitFor()
const guestCode = (await guest.locator('.friends-lobby__code').innerText()).replace(/\s/g, '')
console.log('guest sees', guestCode)
if (guestCode !== code) throw new Error('mismatch ' + guestCode)
await guest.screenshot({ path: `${OUT}/lobby-guest-1280.png` })
await leaveLobby(guest)
await leaveLobby(host)
console.log('left cleanly')
console.log('SMOKE PASS')
await browser.close()
