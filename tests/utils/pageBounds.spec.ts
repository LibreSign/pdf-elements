// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import { findMostVisiblePage, getViewportWindow, isPageInViewport } from '../../src/utils/pageBounds'

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

describe('findMostVisiblePage', () => {
  const rects = [
    { docIndex: 0, pageIndex: 0, top: -400, bottom: 100 },
    { docIndex: 0, pageIndex: 1, top: 100, bottom: 600 },
  ]

  it('picks the page with the largest visible area', () => {
    expect(findMostVisiblePage(rects, 500)).toEqual({ docIndex: 0, pageIndex: 1 })
  })

  it('returns null when nothing is visible', () => {
    expect(findMostVisiblePage([], 500)).toBeNull()
    expect(findMostVisiblePage([{ docIndex: 0, pageIndex: 0, top: 600, bottom: 900 }], 500)).toBeNull()
  })
})
