import { expect, test, type Page, type WebSocketRoute } from '@playwright/test'
import { appVersion } from './appVersion'

async function sit(page: Page, name: string) {
  const field = page.getByLabel('Your name at the table')
  const ready = page.getByRole('button', { name: 'Deal now' }).or(page.getByText('Waiting for the host'))
  await expect(field.or(ready)).toBeVisible({ timeout: 20_000 })
  if (await field.isVisible()) {
    await field.fill(name)
    await page.getByRole('button', { name: 'Sit down' }).click()
  }
}

test('a dropped friend is explained, and leaving makes the next person host', async ({ browser, page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.locator('.home__version')).toContainText(`v${appVersion()}`)
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr3-home-390.png' })

  await page.getByRole('button', { name: 'Host friends table' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Hearts/ }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
  await sit(page, 'Ada')
  await expect(page.locator('.friends-lobby__code')).toBeVisible({ timeout: 20_000 })
  const code = (await page.locator('.friends-lobby__code').innerText()).trim()

  const guestCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const guest = await guestCtx.newPage()
  let socket: WebSocketRoute | null = null
  await guest.routeWebSocket(/.*/, (ws) => {
    if (!/^wss?:\/\/(127\.0\.0\.1|localhost):8799(\/|$)/.test(ws.url())) {
      ws.close()
      return
    }
    socket = ws
    ws.connectToServer()
  })
  await guest.goto(`./?room=${code}&game=hearts`)
  await sit(guest, 'Ben')
  await expect(guest.getByText('Waiting for the host')).toBeVisible({ timeout: 20_000 })

  await page.getByRole('button', { name: 'Deal now' }).click()
  await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20_000 })
  await guest.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20_000 })
  for (const who of [page, guest]) {
    const skip = who.getByRole('button', { name: 'Skip tips' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
  }

  if (!socket) throw new Error('guest socket missing')
  const cameBack = guest.getByText('Back at the table.').waitFor({ state: 'visible', timeout: 12_000 })
  await (socket as WebSocketRoute).close()
  await expect(page.getByText('Ben stepped away')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Seat held/)).toBeVisible()
  await expect(page.getByText(/computer may take their turn/)).toHaveCount(0)
  const awayHeight = await page.locator('.connection-banner--away').evaluate((el) => el.getBoundingClientRect().height)
  expect(awayHeight).toBeLessThanOrEqual(72)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr3-away-390.png' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByText('Ben stepped away')).toBeVisible()
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(wide).toBeLessThanOrEqual(1)
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr3-away-1280.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await cameBack

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Home · save progress' }).click()
  await expect(guest.getByText('You are the host now. You start the next game.')).toBeVisible({
    timeout: 15_000,
  })
  await guest.screenshot({ path: '/tmp/mp-ux-shots/pr3-host-390.png' })
  await guestCtx.close()
})
