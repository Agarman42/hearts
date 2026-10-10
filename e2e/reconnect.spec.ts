import { expect, test, type Page, type WebSocketRoute } from '@playwright/test'

type GameName = 'Hearts' | 'Spades' | 'Euchre'

function phaseControl(page: Page, game: GameName) {
  if (game === 'Hearts') {
    return page.getByRole('button', { name: /Pass Left|Pass Right|Pass Across|Keep your cards/ })
  }
  if (game === 'Spades') return page.getByRole('button', { name: 'Lock in' })
  return page.getByRole('button', { name: 'Order up' })
}

async function armSockets(page: Page) {
  let active: WebSocketRoute | null = null
  let opened = 0
  await page.routeWebSocket(/cardparlour\.workers\.dev|127\.0\.0\.1:8787|localhost:8787/, (ws) => {
    opened += 1
    active = ws
    ws.connectToServer()
  })
  return {
    opened: () => opened,
    async drop() {
      const ws = active
      if (!ws) throw new Error('no socket')
      const before = opened
      await ws.close()
      await expect(page.getByText('Reconnecting to the table')).toBeVisible({ timeout: 4000 })
      await expect(page.getByText('Reconnecting to the table')).toBeHidden({ timeout: 8000 })
      expect(opened).toBeGreaterThan(before)
    },
  }
}

async function hostAndDeal(page: Page, game: GameName) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Host friends table' }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: new RegExp(game) }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
  await page.getByLabel('Your name at the table').fill('Ada')
  await page.getByRole('button', { name: 'Sit down' }).click()
  await page.getByRole('button', { name: 'Deal now' }).click()
  await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20000 })
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  if (game !== 'Euchre') {
    await expect(phaseControl(page, game)).toBeVisible({ timeout: 15000 })
  }
  const hand = page.getByText(/Hand \d+/).first()
  await expect(hand).toBeVisible()
  return (await hand.innerText()).replace(/\s+/g, ' ').trim()
}

test.describe('socket drop restores the same phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  for (const game of ['Hearts', 'Spades', 'Euchre'] as const) {
    test(`${game} comes back after the socket drops`, async ({ page }) => {
      const sockets = await armSockets(page)
      const hand = await hostAndDeal(page, game)
      expect(sockets.opened()).toBeGreaterThan(0)
      await sockets.drop()
      await expect(page.getByText(hand).first()).toBeVisible()
      if (game !== 'Euchre') await expect(phaseControl(page, game)).toBeVisible()
      else await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
    })
  }

  test('Hearts refresh mid-pass returns to the same hand', async ({ page }) => {
    await armSockets(page)
    const hand = await hostAndDeal(page, 'Hearts')
    await page.reload()
    const skip = page.getByRole('button', { name: 'Skip tips' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
    await expect(page.getByText(hand).first()).toBeVisible({ timeout: 20000 })
    await expect(phaseControl(page, 'Hearts')).toBeVisible()
  })
})
