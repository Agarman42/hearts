import { expect, test } from '@playwright/test'

test('home shows a Hearts daily streak without one for Spades', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cardparlour.dailyStreak.v1',
      JSON.stringify({
        hearts: { last: '2026-10-11', count: 2 },
        spades: null,
        euchre: null,
      }),
    )
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.getByRole('button', { name: /Today's Hearts hand/ })).toContainText('streak 2')
  await expect(page.getByRole('button', { name: /Today's Spades hand/ })).toContainText(
    'Same cards for every player today',
  )
})


for (const name of ["Today's Hearts hand", "Today's Spades hand", "Today's Euchre hand"]) {
  test(`${name} deals a hand`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await page.getByRole('button', { name: new RegExp(name) }).click()
    const skip = page.getByRole('button', { name: 'Skip tips' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
    await expect(page.locator('.table-hand .hand__hit').first()).toBeVisible()
  })
}
