import { expect, test, type Page } from '@playwright/test'

async function box(page: Page, selector: string) {
  const rect = await page.locator(selector).first().boundingBox()
  if (!rect) throw new Error(`missing ${selector}`)
  return rect
}

async function host(page: Page, game: 'Hearts' | 'Euchre', name: string) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Host friends table' }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(game) }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
  await page.getByLabel('Your name at the table').fill(name)
  await page.getByRole('button', { name: 'Sit down' }).click()
  await expect(page.locator('.friends-lobby__code')).toBeVisible({ timeout: 20_000 })
  return (await page.locator('.friends-lobby__code').innerText()).trim()
}

test.describe('friends lobby join and seats', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('home stamp, unique names, one bad-code alert, and 44px seats', async ({ browser, page }) => {
    test.setTimeout(60_000)
    await page.goto('./')
    await expect(page.locator('.home__version')).toContainText('v0.3.95')
    await page.screenshot({ path: '/tmp/mp-ux-shots/pr1-home-390.png' })

    const code = await host(page, 'Hearts', 'Ada')
    await expect(page.getByRole('button', { name: 'Deal now' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Ada (you, deals)' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'open seats play as the computer' })).toBeVisible()

    for (const selector of [
      '.friends-lobby__gear',
      '.friends-lobby__chair-input',
      '.friends-lobby__sit',
    ]) {
      const rect = await box(page, selector)
      expect(rect.height, selector).toBeGreaterThanOrEqual(44)
      expect(rect.width, selector).toBeGreaterThanOrEqual(44)
    }
    await page.screenshot({ path: '/tmp/mp-ux-shots/pr1-lobby-390.png' })

    const guest = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true,
    })
    const guestPage = await guest.newPage()
    await guestPage.goto(`./?room=${code}&game=hearts`)
    await guestPage.getByLabel('Your name at the table').fill('Ada')
    await guestPage.getByRole('button', { name: 'Sit down' }).click()
    await expect(guestPage.locator('.friends-lobby__code')).toHaveText(code, { timeout: 20_000 })
    await expect(guestPage.getByRole('textbox', { name: 'Rename Ada 2', exact: true })).toHaveValue('Ada 2')
    await expect(guestPage.getByRole('textbox', { name: 'Rename Ada', exact: true })).toHaveValue('Ada')
    await expect(guestPage.getByRole('status').filter({ hasText: 'Ada 2 (you)' })).toBeVisible()
    await expect(guestPage.getByText('Waiting for the host')).toBeVisible()
    await guestPage.screenshot({ path: '/tmp/mp-ux-shots/pr1-join-390.png' })
    await guest.close()

    await page.goto('./?room=ZZZZ&game=hearts')
    await expect(page.getByRole('alert')).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByRole('alert')).toContainText('No table with that code')
    await expect(page.getByRole('button', { name: 'Join a different table' })).toBeVisible()
    await page.screenshot({ path: '/tmp/mp-ux-shots/pr1-bad-code-390.png' })
  })

  test('partner buttons are 44px and a desktop lobby does not overflow', async ({ browser, page }) => {
    const code = await host(page, 'Euchre', 'Ada')
    const guest = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const guestPage = await guest.newPage()
    await guestPage.goto(`./?room=${code}&game=euchre`)
    await guestPage.getByLabel('Your name at the table').fill('Bea')
    await guestPage.getByRole('button', { name: 'Sit down' }).click()
    await expect(guestPage.getByRole('button', { name: /Be Ada's partner|Ada's partner/ })).toBeVisible({
      timeout: 20_000,
    })
    const partner = await box(guestPage, '.friends-lobby__rel-btn')
    expect(partner.height).toBeGreaterThanOrEqual(44)
    expect(partner.width).toBeGreaterThanOrEqual(44)
    await guest.close()

    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('.friends-lobby__code')).toBeVisible()
    const extra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(extra).toBeLessThanOrEqual(1)
    await page.screenshot({ path: '/tmp/mp-ux-shots/pr1-lobby-1280.png' })
  })
})
