import { expect, test, type Page } from '@playwright/test'

async function prep(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cardtable.prefs.hearts.v3',
      JSON.stringify({
        gameSpeed: 'instant',
        reduceMotion: true,
        coachTipsEnabled: false,
        soundEnabled: false,
      }),
    )
  })
}

async function poke(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {})
  const lock = page.getByRole('button', { name: /^Lock in / })
  if ((await lock.count()) > 0 && (await lock.first().isEnabled().catch(() => false))) {
    await lock.first().click().catch(() => {})
    return
  }
  const bid = page.getByRole('button', { name: /^(Pass|Order up|Pick up|Clubs|Diamonds|Hearts|Spades|Alone|Go alone)$/ })
  if ((await bid.count()) > 0 && (await bid.first().isEnabled().catch(() => false))) {
    await bid.first().click().catch(() => {})
    return
  }
  const hit = page.locator('.table-hand button.hand__hit:enabled')
  if ((await hit.count()) > 0) {
    await hit.first().focus()
    await page.keyboard.press('Enter')
  }
}

async function gap(page: Page, row: string, name: string) {
  return page.locator(row).first().evaluate((el, nameSelector) => {
    const avatar = el.querySelector('.avatar')
    const label = el.querySelector(nameSelector)
    if (!avatar || !label) return -1
    const face = avatar.getBoundingClientRect()
    const text = label.getBoundingClientRect()
    return Math.round(text.left - face.right)
  }, name)
}

test('Spades and Euchre hand rows keep a 12px portrait gap', async ({ browser, page }) => {
  test.setTimeout(150_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await prep(page)

  for (const game of ['Euchre', 'Spades'] as const) {
    await page.goto('./')
    await page.getByRole('button', { name: 'Host friends table' }).click()
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(game) }).click()
    await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
    await page.getByLabel('Your name at the table').fill('Ada')
    await page.getByRole('button', { name: 'Sit down' }).click()
    const code = (await page.locator('.friends-lobby__code').innerText()).trim()

    const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const guest = await guestCtx.newPage()
    await prep(guest)
    await guest.goto(`./?room=${code}&game=${game.toLowerCase()}`)
    await guest.getByLabel('Your name at the table').fill('Bea')
    await guest.getByRole('button', { name: 'Sit down' }).click()
    await page.getByRole('button', { name: 'Deal now' }).click()
    await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20_000 })

    const row = game === 'Euchre' ? '.euchre-hand-breakdown__who' : '.spades-hand-breakdown__player-name'
    const name = game === 'Euchre' ? '.euchre-hand-breakdown__name' : '.spades-hand-breakdown__who'
    const started = Date.now()
    while (Date.now() - started < 70_000) {
      if (await page.locator(row).first().isVisible().catch(() => false)) break
      await poke(page)
      await poke(guest)
      await page.waitForTimeout(40)
    }
    await expect(page.locator(row).first()).toBeVisible()
    expect(await page.locator(`${row} .avatar`).count()).toBeGreaterThanOrEqual(1)
    expect(await gap(page, row, name)).toBeGreaterThanOrEqual(12)

    const leave = page.getByRole('button', { name: 'Leave' })
    await expect(leave).toBeVisible()
    const box = await leave.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    const hit = await leave.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return top === el || el.contains(top)
    })
    expect(hit).toBe(true)
    await expect(guest.getByText('Waiting for the host to start a rematch.')).toHaveCount(0)

    await page.setViewportSize({ width: 1280, height: 800 })
    expect(await gap(page, row, name)).toBeGreaterThanOrEqual(12)
    await guestCtx.close()
    await page.setViewportSize({ width: 390, height: 844 })
  }
})
