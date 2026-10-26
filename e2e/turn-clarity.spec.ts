import { expect, test, type Page } from '@playwright/test'

async function host(page: Page, game: 'Hearts' | 'Spades' | 'Euchre') {
  await page.goto('./')
  await page.getByRole('button', { name: 'Host friends table' }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(game) }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
  const name = page.getByLabel('Your name at the table')
  const deal = page.getByRole('button', { name: 'Deal now' })
  await expect(name.or(deal)).toBeVisible({ timeout: 20_000 })
  if (await name.isVisible()) {
    await name.fill('Ada')
    await page.getByRole('button', { name: 'Sit down' }).click()
  }
  await deal.click()
  await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20_000 })
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test('pass, bid, and order-up read the same on a phone', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.locator('.home__version')).toContainText('v0.3.97')

  await host(page, 'Hearts')
  await expect(page.locator('.pass-ui__banner')).toHaveText(/pass 3 left/i)
  await expect(page.locator('.pass-ui__round-num')).toHaveText('1')
  await expect(page.getByRole('timer', { name: /seconds left/ })).toBeVisible()
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr2-hearts-pass-390.png' })

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.locator('.pass-ui__banner')).toHaveText(/pass 3 left/i)
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr2-hearts-pass-1280.png' })

  await page.setViewportSize({ width: 390, height: 844 })
  await host(page, 'Spades')
  await expect(page.getByText(/nil/i).first()).toBeVisible()
  await expect(page.getByText(/Bags/i).first()).toBeVisible()
  await expect(page.getByRole('timer', { name: /seconds left/ })).toBeVisible()
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr2-spades-bid-390.png' })

  await host(page, 'Euchre')
  await expect(
    page.getByText(/order up or pass|name trump or pass|Stick the dealer|Order up|Pick up/i).first(),
  ).toBeVisible()
  await expect(page.getByRole('timer', { name: /seconds left/ })).toBeVisible()
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr2-euchre-bid-390.png' })
})
