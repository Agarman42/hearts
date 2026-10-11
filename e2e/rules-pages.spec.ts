import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  { path: './rules/hearts/', title: 'How to play Hearts', line: 'The two of clubs leads' },
  { path: './rules/spades/', title: 'How to play Spades', line: 'Spades are trump' },
  { path: './rules/euchre/', title: 'How to play Euchre', line: 'left bower' },
] as const

for (const rules of pages) {
  test(`${rules.title} is a static page`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(rules.path)
    await expect(page.getByRole('heading', { level: 1, name: rules.title })).toBeVisible()
    await expect(page.getByText(rules.line).first()).toBeVisible()
    const play = page.getByRole('link', { name: 'Play now' })
    await expect(play).toHaveAttribute('href', '../../')
    await play.focus()
    const box = await play.boundingBox()
    expect(box && box.height).toBeGreaterThanOrEqual(44)

    const violations = (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
}

test('settings links to the Hearts rules page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).first().click()
  await page.getByRole('link', { name: 'Hearts rules' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'How to play Hearts' })).toBeVisible()
})
