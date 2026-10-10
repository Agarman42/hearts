import { expect, test } from '@playwright/test'

test('friends lobby shows a 44px turn limit before the deal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Host friends table' }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /Hearts/ }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
  await page.getByLabel('Your name at the table').fill('Ada')
  await page.getByRole('button', { name: 'Sit down' }).click()
  const limit = page.getByRole('group', { name: 'Turn limit' })
  await expect(limit).toBeVisible()
  const sixty = limit.getByRole('button', { name: '60s' })
  await expect(sixty).toHaveAttribute('aria-pressed', 'true')
  const box = await sixty.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  await expect(page.getByRole('button', { name: 'Deal now' })).toBeVisible()
})
