import { expect, test } from '@playwright/test'

test("Today's Hearts hand deals a hand", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: /Today's Hearts hand/ }).click()
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await expect(page.locator('.table-hand .hand__hit').first()).toBeVisible()
})
