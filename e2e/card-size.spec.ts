import { expect, test } from '@playwright/test'

async function slotWidth(page: import('@playwright/test').Page) {
  const box = await page.locator('.hand__slot').first().boundingBox()
  return box?.width ?? 0
}

async function handStaysOnScreen(page: import('@playwright/test').Page) {
  const edges = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.hand__slot')]
    const first = slots[0]?.getBoundingClientRect()
    const last = slots[slots.length - 1]?.getBoundingClientRect()
    return {
      n: slots.length,
      left: first?.left ?? 0,
      right: last?.right ?? 0,
      vw: window.innerWidth,
    }
  })
  expect(edges.n).toBe(13)
  expect(edges.left).toBeGreaterThanOrEqual(-1)
  expect(edges.right).toBeLessThanOrEqual(edges.vw + 1)
}

test('Large makes the hand wider and keeps every card on screen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cardtable.prefs.hearts.v3',
      JSON.stringify({ gameSpeed: 'instant', coachTipsEnabled: false }),
    )
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.locator('.home__game-tile--hearts').click()
  await page.getByRole('list', { name: /Your hand/ }).waitFor()
  const medium = await slotWidth(page)
  await handStaysOnScreen(page)

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Large' }).click()
  await page.getByRole('button', { name: /Back/i }).click()
  await page.getByRole('list', { name: /Your hand/ }).waitFor()
  const large = await slotWidth(page)
  expect(large).toBeGreaterThan(medium + 4)
  await handStaysOnScreen(page)
})
