import { expect, test } from '@playwright/test'
import { appVersion } from './appVersion'

test('home shows the version at phone and desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.locator('.home__version')).toContainText(`v${appVersion()}`)
  const phone = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(phone).toBeLessThanOrEqual(1)
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr4-home-390.png' })

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.locator('.home__version')).toBeVisible()
  const desk = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(desk).toBeLessThanOrEqual(1)
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr4-home-1280.png' })
})
