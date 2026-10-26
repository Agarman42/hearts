import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

mkdirSync('/tmp/mp-ux-shots', { recursive: true })

async function fastTable(page: Page) {
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

async function shortenHearts(page: Page) {
  await page.route('**/rooms', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    const raw = route.request().postData()
    const body = raw ? (JSON.parse(raw) as { rules?: { hearts?: { raceTo?: number; passCount?: number } } }) : {}
    if (body.rules?.hearts) {
      body.rules.hearts.raceTo = 1
      body.rules.hearts.passCount = 0
    }
    await route.continue({ postData: JSON.stringify(body) })
  })
}

async function poke(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip tips' })
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {})
  const pass = page.getByRole('button', { name: /Pass Left|Pass Right|Pass Across|Keep your cards|Add to hand/ })
  if ((await pass.count()) > 0 && (await pass.first().isEnabled().catch(() => false))) {
    await pass.first().click().catch(() => {})
    return
  }
  const hit = page.locator('.table-hand button.hand__hit:enabled')
  if ((await hit.count()) > 0) {
    await hit.first().focus()
    await page.keyboard.press('Enter')
  }
}

test('host match-end sheet sits above the table at 390', async ({ browser, page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await fastTable(page)
  await shortenHearts(page)
  await page.goto('./')
  await page.getByRole('button', { name: 'Host friends table' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Hearts/ }).click()
  await page.locator('.home-confirm__card').getByRole('button', { name: /^Kitchen/ }).click()
  await page.getByLabel('Your name at the table').fill('Ada')
  await page.getByRole('button', { name: 'Sit down' }).click()
  await expect(page.locator('.friends-lobby__code')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Race to 1')).toBeVisible()
  await expect(page.getByText('Pass 0')).toBeVisible()
  const code = (await page.locator('.friends-lobby__code').innerText()).trim()

  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const guest = await guestCtx.newPage()
  await fastTable(guest)
  await guest.goto(`./?room=${code}&game=hearts`)
  await guest.getByLabel('Your name at the table').fill('Ben')
  await guest.getByRole('button', { name: 'Sit down' }).click()
  await expect(guest.getByText('Waiting for the host')).toBeVisible({ timeout: 20_000 })

  await page.getByRole('button', { name: 'Deal now' }).click()
  await page.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20_000 })
  await guest.getByRole('button', { name: 'Menu' }).waitFor({ timeout: 20_000 })

  const rematch = page.getByRole('button', { name: 'Rematch' })
  const waiting = guest.getByText('Waiting for the host to start a rematch.')
  const started = Date.now()
  while (Date.now() - started < 150_000) {
    if ((await rematch.isVisible().catch(() => false)) && (await waiting.isVisible().catch(() => false))) {
      break
    }
    await poke(page)
    await poke(guest)
    await page.waitForTimeout(40)
  }
  await expect(rematch).toBeVisible()
  await expect(waiting).toBeVisible()

  const hit = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === 'Rematch')
    const overlay = document.querySelector('.overlay')
    if (!button || !overlay) return { ok: false, seatsAbove: ['missing'], target: '' }
    const rect = button.getBoundingClientRect()
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    const seatsAbove: string[] = []
    for (const seat of document.querySelectorAll('.seat')) {
      const box = seat.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue
      const atSeat = document.elementFromPoint(x, y)
      if (!atSeat || !overlay.contains(atSeat)) seatsAbove.push((seat.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24))
    }
    return {
      ok: top === button || button.contains(top),
      seatsAbove,
      target: top instanceof HTMLElement ? `${top.tagName}.${top.className}` : '',
    }
  })
  expect(hit.seatsAbove, hit.target).toEqual([])
  expect(hit.ok, hit.target).toBe(true)

  await page.screenshot({ path: '/tmp/mp-ux-shots/pr4-hearts-end-host-390.png' })
  await guest.screenshot({ path: '/tmp/mp-ux-shots/pr4-hearts-end-guest-390.png' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await guest.setViewportSize({ width: 1280, height: 800 })
  await expect(rematch).toBeVisible()
  await page.screenshot({ path: '/tmp/mp-ux-shots/pr4-hearts-end-host-1280.png' })
  await guest.screenshot({ path: '/tmp/mp-ux-shots/pr4-hearts-end-guest-1280.png' })
  await guestCtx.close()
})
