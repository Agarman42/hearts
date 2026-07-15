import { test, expect, type Page } from '@playwright/test'
import { APP_NAME } from '../src/appBrand'

test.describe.configure({ mode: 'serial' })

async function startHearts(page: Page) {
  await page.locator('.home__game-tile--hearts').click()
}

async function startSpades(page: Page) {
  await page.locator('.home__game-tile--spades').click()
}

async function startEuchre(page: Page) {
  await page.locator('.home__game-tile--euchre').click()
}

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()
})

test('boots to main menu with version stamp', async ({ page }) => {
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()
  await expect(page.locator('.home__version')).toContainText(/^v\d+\.\d+\.\d+ · build /)
  await expect(page.locator('.home__game-tile--hearts')).toBeVisible()
  await expect(page.locator('.home__game-tile--spades')).toBeVisible()
  await expect(page.locator('.home__game-tile--euchre')).toBeVisible()
})

test('shows Hearts coach tips on first deal', async ({ page }) => {
  await startHearts(page)
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Play a card' })).toBeVisible()
})

test('per-game coach tips are independent', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()

  await startSpades(page)
  const crossGameConfirm = page.getByRole('dialog', { name: /Start Spades anyway/i })
  await expect(crossGameConfirm).toBeVisible()
  await crossGameConfirm.getByRole('button', { name: 'New table' }).click()
  await expect(page.getByText('Bid with your partner')).toBeVisible()
})

test('settings opens from home', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('settings back from home stays on home even with in-progress save', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: /Back/i }).click()
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()
})

test('resume continues an in-progress hearts match', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()
  await expect(page.getByRole('button', { name: /Resume/i })).toBeVisible()

  await page.getByRole('button', { name: /Resume/i }).click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
})

test('mobile viewport shows home and game tiles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible()
  await expect(page.locator('.home__game-tile--hearts')).toBeVisible()
})

test('coach tips off skips first-deal dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const coachRow = page.locator('.settings__row', {
    has: page.getByText('Coach tips', { exact: true }),
  })
  await coachRow.getByRole('switch').click()
  await page.getByRole('button', { name: /Back/i }).click()

  await startHearts(page)
  await expect(page.getByRole('dialog', { name: 'How to play' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 15000 })
})

test('settings game switcher edits rules without leaving settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByRole('tab', { name: /Spades/i }).click()
  await expect(page.getByRole('heading', { name: 'American Spades' })).toBeVisible()
  await page.getByLabel('Race to').selectOption('250')

  await page.getByRole('tab', { name: /Euchre/i }).click()
  await expect(page.getByRole('heading', { name: 'American Euchre' })).toBeVisible()

  await page.getByRole('tab', { name: /Hearts/i }).click()
  await expect(page.getByRole('heading', { name: 'Classic Hearts' })).toBeVisible()
})

test('home new table asks for confirmation when save exists', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()

  await page.getByRole('button', { name: 'New table' }).click()
  await expect(page.getByRole('heading', { name: /Start a new Hearts table/i })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: /Resume/i })).toBeVisible()
})

test('quit match asks for confirmation', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Quit match' }).click()
  await expect(page.getByRole('heading', { name: 'Quit this match?' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()
})

test('stats page has copy snapshot button', async ({ page }) => {
  await page.getByRole('button', { name: 'Stats · Goals · Trophies' }).click()
  await expect(page.getByRole('button', { name: 'Copy snapshot' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy summary' })).toBeVisible()
})

test('settings can hide recent matches on home', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  const recentRow = page.locator('.settings__row', {
    has: page.getByText('Recent matches on home', { exact: true }),
  })
  await expect(recentRow).toBeVisible()
  await recentRow.getByRole('switch').click()
  await page.getByRole('button', { name: /Back/i }).click()
  await expect(page.getByRole('heading', { name: 'Recent matches' })).not.toBeVisible()
})

test('hearts presets appear in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: /Quick 50/i }).click()
  await expect(page.getByLabel('Race to')).toHaveValue('50')
})

test('spades bag mercy toggle is available in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('tab', { name: /Spades/i }).click()
  const mercyRow = page.locator('.settings__row', { has: page.getByText('Bag mercy', { exact: true }) })
  await expect(mercyRow).toBeVisible()
  await mercyRow.getByRole('switch').click()
})

test('deal another game confirms when a different save exists', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()

  await startEuchre(page)
  const crossGameConfirm = page.getByRole('dialog', { name: /Start Euchre anyway/i })
  await expect(crossGameConfirm).toBeVisible()
  await expect(crossGameConfirm.getByText(/Hearts match stays saved/i)).toBeVisible()
  await crossGameConfirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: /Resume/i })).toBeVisible()
})

test('stats page has download career export', async ({ page }) => {
  await page.getByRole('button', { name: 'Stats · Goals · Trophies' }).click()
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import JSON' })).toBeVisible()
})

test('resume tile shows phase hint when save exists', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()
  await expect(page.locator('.home__game-hint').first()).toBeVisible()
})

test('latest save tile shows Resume Latest badge', async ({ page }) => {
  await startHearts(page)
  await page.getByRole('button', { name: 'Skip tips' }).click()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home · save progress/i }).click()
  await expect(page.getByRole('button', { name: /Resume · Latest/i })).toBeVisible()
})

test('recent match opens stats on matching game tab', async ({ page, context }) => {
  await context.addInitScript(() => {
    const stats = {
      matchesPlayed: 1,
      matchesWon: 1,
      handsPlayed: 5,
      moonsShot: 0,
      moonsAgainst: 0,
      queensTaken: 0,
      queenFreeStreak: 0,
      handsWithZero: 0,
      handsUnderFive: 0,
      handsHeavy: 0,
      winStreak: 1,
      bestWinStreak: 1,
      bestWinScore: 120,
      worstLossScore: null,
      pointsTaken: 0,
      bestHandScore: null,
      worstHandScore: null,
      recentMatches: [
        {
          at: Date.now(),
          won: true,
          yourScore: 120,
          winnerScore: 120,
          handsInMatch: 5,
          moonsShot: 0,
          cleanHands: 0,
        },
      ],
      nilMade: 0,
      nilFailed: 0,
      blindNilMade: 0,
      teamBidsMade: 0,
      teamBidsSet: 0,
      bagPenalties: 0,
      ordersMade: 0,
      ordersFailed: 0,
      euchresMade: 0,
      marchesMade: 0,
      lonersMade: 0,
    }
    localStorage.setItem('cardtable.stats.spades.v2', JSON.stringify(stats))
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Recent matches' })).toBeVisible()
  await page.getByRole('button', { name: /Spades win/i }).click()
  await expect(page.getByRole('tab', { name: /Spades/i })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Spades Achievements' })).toBeVisible()
})

test('daily challenges button opens daily challenges section', async ({ page }) => {
  await page.getByRole('button', { name: /Today's challenges:/i }).click()
  await expect(page.getByRole('heading', { name: "Today's challenges" })).toBeVisible()
  await expect(page.locator('#stats-daily-challenges')).toBeInViewport()
})