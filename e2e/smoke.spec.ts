import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
})

test('boots to main menu with version stamp', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Cutthroat' })).toBeVisible()
  await expect(page.locator('.home__version')).toContainText(/^v\d+\.\d+\.\d+ · build /)
  await expect(page.getByRole('button', { name: /Deal / })).toBeVisible()
})

test('shows Hearts coach tips on first deal', async ({ page }) => {
  await page.getByRole('button', { name: /Deal Hearts/i }).click()
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Play a card' })).toBeVisible()
})

test('per-game coach tips are independent', async ({ page }) => {
  await page.getByRole('button', { name: /Deal Hearts/i }).click()
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()

  await page.getByRole('button', { name: /♠ Spades/i }).click()
  await expect(page.getByText('Bid with your partner')).toBeVisible()
})

test('settings opens from home', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})