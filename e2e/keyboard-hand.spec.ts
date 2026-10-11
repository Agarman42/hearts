import { expect, test } from '@playwright/test'

test('arrow keys move through the hand and Enter plays a card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: /Instant/i }).click()
  await page.getByRole('radio', { name: /No pass/i }).click()
  await page.getByRole('button', { name: /Back/i }).click()
  await page.locator('.home__game-tile--hearts').click()
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible().catch(() => false)) await skip.click()

  const hits = page.locator('.hand--your-turn .hand__hit:not([disabled])')
  await expect(hits.first()).toBeVisible()
  await hits.first().focus()
  const beforeLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  await page.keyboard.press('ArrowRight')
  const focused = page.locator('.hand--your-turn .hand__hit:focus')
  await expect(focused).toHaveCount(1)
  if ((await hits.count()) > 1) {
    await expect(focused).not.toHaveAttribute('aria-label', beforeLabel ?? '')
  }

  const before = await page.locator('[data-trick-card]').count()
  await focused.press('Enter')
  await expect.poll(async () => page.locator('[data-trick-card]').count()).toBeGreaterThan(before)
})
