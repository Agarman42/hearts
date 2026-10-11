import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function serious(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

function format(label: string, violations: Awaited<ReturnType<typeof serious>>) {
  if (violations.length === 0) return ''
  const lines = violations.map((v) => {
    const nodes = v.nodes
      .slice(0, 6)
      .map((n) => `  ${n.target.join(' ')}`)
      .join('\n')
    return `${label}: ${v.id} (${v.impact}) ${v.help}\n${nodes}`
  })
  return lines.join('\n')
}

test('home, settings, and each table have no serious axe issues', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Card Parlour' })).toBeVisible()

  const problems: string[] = []
  const note = (text: string) => {
    if (!text) return
    problems.push(text)
    console.log(text)
  }
  note(format('home', await serious(page)))

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  note(format('settings', await serious(page)))
  await page.getByRole('button', { name: /Back/i }).click()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: /Instant/i }).click()
  await page.getByRole('radio', { name: /No pass/i }).click()
  await page.getByRole('button', { name: /Back/i }).click()

  await page.locator('.home__game-tile--hearts').click()
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible()) await skip.click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
  note(format('hearts', await serious(page)))

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home/i }).click()
  await page.locator('.home__game-tile--spades').click()
  const neu = page.getByRole('dialog').getByRole('button', { name: 'New table' })
  if (await neu.isVisible()) await neu.click()
  if (await skip.isVisible()) await skip.click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
  note(format('spades', await serious(page)))

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home/i }).click()
  await page.locator('.home__game-tile--euchre').click()
  if (await neu.isVisible()) await neu.click()
  if (await skip.isVisible()) await skip.click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
  note(format('euchre', await serious(page)))

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Home/i }).click()
  const leave = page.getByRole('dialog').getByRole('button', { name: 'New table' })
  if (await leave.isVisible()) await leave.click()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByRole('heading', { name: 'Card Parlour' })).toBeVisible()
  note(format('home-wide', await serious(page)))

  expect(problems, problems.join('\n\n')).toEqual([])
})
