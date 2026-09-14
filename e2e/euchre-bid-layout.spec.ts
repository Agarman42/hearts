import { test, expect, type Page } from '@playwright/test'
import { APP_NAME } from '../src/appBrand'

test.describe.configure({ mode: 'serial' })

async function skipCoachIfPresent(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.click()
  }
}

async function startEuchre(page: Page) {
  await page.locator('.home__game-tile--euchre').click()
  const crossGame = page.getByRole('dialog', { name: /Start Euchre anyway/i })
  if (await crossGame.isVisible({ timeout: 800 }).catch(() => false)) {
    await crossGame.getByRole('button', { name: 'New table' }).click()
  }
  await skipCoachIfPresent(page)
}

async function waitForHumanBidRail(page: Page) {
  const rail = page.locator('.table-screen--euchre-bid-hud-rail')
  await expect(rail).toBeVisible({ timeout: 25_000 })
  await expect(page.locator('.euchre-bid-south .spades-hud')).toBeVisible()
  await expect(page.locator('.table-hand .hand__slot .card')).toHaveCount(5)
}

function noVerticalOverlap(
  a: { y: number; height: number },
  b: { y: number; height: number },
  gap = 2,
) {
  return a.y + a.height <= b.y + gap || b.y + b.height <= a.y + gap
}

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('cardtable.coach.euchre.v1', '1')
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()
})

test('phone bid turn keeps the YOU pill off the south hand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await startEuchre(page)
  await waitForHumanBidRail(page)

  const kitty = page.locator('.euchre-kitty')
  const sheet = page.locator('.euchre-table-stage')
  const hud = page.locator('.euchre-bid-south .spades-hud')
  const cards = page.locator('.table-hand .hand__slot .card')

  const kittyBox = await kitty.boundingBox()
  const sheetBox = await sheet.boundingBox()
  const hudBox = await hud.boundingBox()
  expect(kittyBox, 'kitty on screen').toBeTruthy()
  expect(sheetBox, 'bid sheet on screen').toBeTruthy()
  expect(hudBox, 'south HUD on screen').toBeTruthy()
  if (!kittyBox || !sheetBox || !hudBox) return

  expect(
    noVerticalOverlap(kittyBox, sheetBox, 4),
    `kitty overlaps bid sheet: kitty ${JSON.stringify(kittyBox)} sheet ${JSON.stringify(sheetBox)}`,
  ).toBe(true)
  expect(
    noVerticalOverlap(sheetBox, hudBox, 4),
    `bid sheet overlaps HUD: sheet ${JSON.stringify(sheetBox)} hud ${JSON.stringify(hudBox)}`,
  ).toBe(true)

  const count = await cards.count()
  expect(count).toBe(5)
  for (let i = 0; i < count; i++) {
    const cardBox = await cards.nth(i).boundingBox()
    expect(cardBox, `card ${i} on screen`).toBeTruthy()
    if (!cardBox) continue
    expect(
      cardBox.y + 2,
      `card ${i} top is covered by the YOU pill`,
    ).toBeGreaterThanOrEqual(hudBox.y + hudBox.height)
    expect(cardBox.y, `card ${i} clipped above the viewport`).toBeGreaterThanOrEqual(-2)
    expect(
      cardBox.y + cardBox.height,
      `card ${i} clipped below the viewport`,
    ).toBeLessThanOrEqual(844 + 8)
  }
})
