import { expect, test } from '@playwright/test'

test('a 12-player euchre night shows three tables and keeps a score', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: /Euchre night/ }).click()
  await page.getByRole('button', { name: '12 players' }).click()
  await page.getByRole('button', { name: 'Start night' }).click()
  await expect(page.getByText('Round 1 of 6')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Table 1' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Table 3' })).toBeVisible()
  const table = page.getByRole('region', { name: 'Table 1' })
  await table.getByLabel('North-South').fill('10')
  await table.getByLabel('East-West').fill('6')
  await table.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Next round' })).toBeDisabled()
})
