// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import { getViewportWindow, isPageInViewport } from '../../src/utils/pageBounds'

describe('pageBounds', () => {
  it('computes viewport window with margin', () => {
    const { minY, maxY } = getViewportWindow(200, 300, 50)
    expect(minY).toBe(150)
    expect(maxY).toBe(550)
  })

  it('checks if page is in viewport', () => {
    expect(isPageInViewport(100, 200, 0, 250)).toBe(true)
    expect(isPageInViewport(400, 50, 0, 300)).toBe(false)
  })
})
