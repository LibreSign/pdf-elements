// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { chromium, devices } from '@playwright/test'
import { createServer } from 'vite'

const screenshotPath = 'img/screenshot/demo.png'

const server = await createServer()
await server.listen()

const browser = await chromium.launch()
const context = await browser.newContext({
  ...devices['Desktop Chrome'],
  locale: 'en-US',
  viewport: { width: 1280, height: 900 },
})
const page = await context.newPage()

await page.goto(server.resolvedUrls.local[0])
await page.getByRole('button', { name: 'Load sample PDF' }).click()
await page.locator('canvas').first().waitFor()
await page.getByRole('button', { name: 'Add Signature' }).click()
await page.getByRole('button', { name: 'Click to place' }).waitFor()
await page.locator('.overlay').first().click({ position: { x: 100, y: 300 } })
await page.locator('.signature-box').first().waitFor()
await page.screenshot({ path: screenshotPath })

await browser.close()
await server.close()
