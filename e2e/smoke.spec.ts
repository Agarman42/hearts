import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Cutthroat' })).toBeVisible()
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

test('settings back from home stays on home even with in-progress save', async ({ page }) => {
  await page.getByRole('button', { name: /Deal Hearts/i }).click()
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()
  await expect(page.getByRole('heading', { name: 'Cutthroat' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: /Back/i }).click()
  await expect(page.getByRole('heading', { name: 'Cutthroat' })).toBeVisible()
})

test('resume continues an in-progress hearts match', async ({ page }) => {
  await page.getByRole('button', { name: /Deal Hearts/i }).click()
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()
  await expect(page.getByRole('button', { name: /Resume/i })).toBeVisible()

  await page.getByRole('button', { name: /Resume/i }).click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
})