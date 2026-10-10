import { test, expect } from '@playwright/test'

test('sound starts off and the volume control appears only after it is turned on', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).first().click()
  const sound = page.getByRole('switch', { name: 'Sound' })
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Off until you turn it on.')).toBeVisible()
  await expect(page.getByLabel('Sound volume')).toHaveCount(0)
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Off until you turn it on.')).toHaveCount(0)
  await expect(page.getByText('Nothing plays before you tap.')).toBeVisible()
  await expect(page.getByLabel('Sound volume')).toBeVisible()
})
