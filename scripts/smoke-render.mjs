import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const candidates = [
  path.join(process.env.HOME, '.cache/ms-playwright'),
  '/home/adam/.cache/ms-playwright',
]
let executablePath
for (const base of candidates) {
  if (!fs.existsSync(base)) continue
  const dirs = fs.readdirSync(base).filter((d) => d.startsWith('chromium-'))
  dirs.sort()
  for (const d of dirs.reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome')
    if (fs.existsSync(p)) {
      executablePath = p
      break
    }
  }
  if (executablePath) break
}
if (!executablePath) {
  console.error('no chromium')
  process.exit(1)
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message + '\n' + e.stack))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('CON: ' + msg.text())
})
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2500)
const rootHTML = await page.$eval('#root', (el) => el.innerHTML).catch(() => 'NO ROOT')
const rootText = await page.$eval('#root', (el) => el.innerText).catch(() => '')
console.log('rootHTML length', rootHTML.length)
console.log('rootText sample', JSON.stringify(rootText.slice(0, 200)))
console.log('ERRORS:\n' + (errors.join('\n\n') || '(none)'))
await browser.close()
