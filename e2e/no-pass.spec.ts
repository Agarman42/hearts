import { expect, test } from '@playwright/test'

test('No pass deals Hearts straight into the hand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: /Instant/i }).click()
  await page.getByRole('radio', { name: /No pass/i }).click()
  await page.getByRole('button', { name: /Back/i }).click()
  await page.locator('.home__game-tile--hearts').click()
  const how = page.getByRole('dialog', { name: 'How to play' })
  await expect(how).toBeVisible()
  await expect(how.getByRole('heading', { name: 'Play a card' })).toBeVisible()
  await expect(how.getByRole('heading', { name: 'Pass three' })).toHaveCount(0)
  await how.getByRole('button', { name: 'Skip tips' }).click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Pass Left|Pass Right|Pass Across|Keep your cards/ })).toHaveCount(0)
  await expect(page.locator('.table-hand .hand__hit').first()).toBeVisible()
})
