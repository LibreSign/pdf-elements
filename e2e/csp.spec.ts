// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect } from '@playwright/test'

test('renders a PDF under a CSP without unsafe-eval', async ({ page }) => {
  const evalErrors: string[] = []

  page.on('console', (message) => {
    const text = message.text()
    if (text.includes('unsafe-eval') || text.includes('call to eval() blocked by CSP')) {
      evalErrors.push(text)
    }
  })

  page.on('pageerror', (error) => {
    if (error.message.includes('eval')) {
      evalErrors.push(error.message)
    }
  })

  await page.goto('/csp.html')
  await page.getByRole('button', { name: 'Load sample PDF' }).click()
  await expect(page.locator('canvas').first()).toBeVisible()

  expect(evalErrors).toEqual([])
})
