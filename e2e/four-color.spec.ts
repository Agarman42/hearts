import { expect, test } from '@playwright/test'

test('four-color suits starts off and paints diamonds and clubs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  const toggle = page.getByRole('switch', { name: 'Four-color suits' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('html')).toHaveAttribute('data-four-color', 'off')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-four-color', 'on')
})
