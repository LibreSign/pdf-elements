// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, devices } from '@playwright/test'
import { createServer } from 'vite'

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const screenshotPath = path.join(packageRoot, 'img', 'screenshot', 'demo.png')

export async function generateScreenshot() {
  const server = await createServer()
  await server.listen()

  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      locale: 'en-US',
      viewport: { width: 900, height: 1000 },
    })
    const page = await context.newPage()

    await page.goto(server.resolvedUrls.local[0])
    await page.getByRole('button', { name: 'Load sample PDF' }).click()
    await page.locator('canvas').first().waitFor()
    await page.getByRole('button', { name: 'Add Signature' }).click()
    await page.getByRole('button', { name: 'Click to place' }).waitFor()
    await page.locator('.overlay').first().click({ position: { x: 100, y: 300 } })
    await page.locator('.signature-box').first().waitFor()

    return await page.screenshot()
  } finally {
    await browser.close()
    await server.close()
  }
}

async function main() {
  await writeFile(screenshotPath, await generateScreenshot())
  globalThis.console.log(`Updated ${path.relative(packageRoot, screenshotPath)}`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null

if (invokedPath === import.meta.url) {
  main().catch((error) => {
    globalThis.console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
