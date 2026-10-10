import { test, expect } from '@playwright/test'
import { APP_NAME } from '../src/appBrand'

test('short landscape home shows Host and the three games', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Host friends table' })).toBeInViewport({ ratio: 1 })
  for (const id of ['hearts', 'spades', 'euchre']) {
    const tile = page.locator(`.home__game-tile--${id}`)
    await expect(tile).toBeInViewport({ ratio: 1 })
    const clipped = await tile.locator('.home__game-name, .home__game-sub').evaluateAll((nodes) =>
      nodes.some((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1),
    )
    expect(clipped).toBe(false)
  }
})
