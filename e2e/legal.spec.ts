import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('settings opens the draft privacy note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).first().click()
  await page.getByRole('button', { name: 'Privacy and terms (draft)' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy and terms' })).toBeVisible()
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible()
  await expect(page.getByText('The display name you type is sent to the table')).toBeVisible()
  await expect(page.getByText(/does not ask for an email/i)).toBeVisible()
  await expect(page.getByText('Card Parlour is for people 13 and older.')).toBeVisible()

  const violations = (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
  ).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(violations.map((v) => v.id)).toEqual([])

  await page.getByRole('button', { name: /Back/i }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})
