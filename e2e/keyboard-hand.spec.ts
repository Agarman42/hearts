import { expect, test, type Page } from '@playwright/test'

async function shown(locator: ReturnType<Page['locator']>) {
  if ((await locator.count()) === 0) return false
  return locator.first().isVisible()
}

async function prep(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: /Instant/i }).click()
  await page.getByRole('button', { name: /Back/i }).click()
}

/** Click through bids and recaps until a card can be played from the keyboard. */
async function untilPlayable(page: Page) {
  const ready = page.locator(
    '.hand--your-turn .hand__hit:not([disabled])[aria-label*="Tap to play"]',
  )
  const deadline = Date.now() + 25_000
  while (Date.now() < deadline) {
    if ((await ready.count()) > 0) return ready
    const skip = page.getByRole('button', { name: 'Skip tips' })
    const cont = page.getByRole('button', { name: /^(Continue|Ready to play)$/ })
    const partner = page.getByRole('button', { name: 'With partner' })
    const suit = page.getByRole('button', { name: /Name \w+ trump/ })
    const order = page.getByRole('button', { name: /^(Order up|Pick up|Pass)$/ })
    const lock = page.getByRole('button', { name: /Lock in/ })
    const discard = page.locator(
      '.hand--your-turn .hand__hit:not([disabled])[aria-label*="Tap to discard"]',
    )
    if (await shown(skip)) await skip.click()
    else if ((await discard.count()) > 0) {
      await discard.first().focus()
      await page.keyboard.press('Enter')
    } else if (await shown(cont)) await cont.first().click()
    else if (await shown(partner)) await partner.click()
    else if (await shown(suit)) await suit.first().click()
    else if (await shown(order)) await order.first().click()
    else if (await shown(lock)) await lock.first().click()
    await page.waitForTimeout(80)
  }
  throw new Error('no card was ready to play')
}

async function arrowThenEnterPlays(page: Page) {
  const hits = await untilPlayable(page)
  await hits.first().focus()
  const beforeLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  await page.keyboard.press('ArrowRight')
  const focused = page.locator('.hand--your-turn .hand__hit:focus')
  await expect(focused).toHaveCount(1)
  if ((await hits.count()) > 1) {
    await expect(focused).not.toHaveAttribute('aria-label', beforeLabel ?? '')
  }
  const before = await page.locator('[data-trick-card]').count()
  await focused.press('Enter')
  await expect.poll(async () => page.locator('[data-trick-card]').count()).toBeGreaterThan(before)
}

test('arrow keys move through a Hearts hand and Enter plays a card', async ({ page }) => {
  await prep(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: /No pass/i }).click()
  await page.getByRole('button', { name: /Back/i }).click()
  await page.locator('.home__game-tile--hearts').click()
  await arrowThenEnterPlays(page)
})

test('arrow keys move through a Spades hand and Enter plays a card', async ({ page }) => {
  await prep(page)
  await page.locator('.home__game-tile--spades').click()
  await arrowThenEnterPlays(page)
})

test('arrow keys move through a Euchre hand and Enter plays a card', async ({ page }) => {
  await prep(page)
  await page.locator('.home__game-tile--euchre').click()
  await arrowThenEnterPlays(page)
})
