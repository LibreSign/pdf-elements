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

describe('findMostVisiblePage selection rules', () => {
  it('uses the visible percentage, not the absolute visible height', () => {
    const rects = [
      { docIndex: 0, pageIndex: 0, top: 0, bottom: 200 },
      { docIndex: 0, pageIndex: 1, top: 220, bottom: 1020 },
    ]
    // 200px page is 100% visible, the tall page only 280/800
    expect(findMostVisiblePage(rects, 500)).toEqual({ docIndex: 0, pageIndex: 0 })
  })

  it('keeps the current page while it is fully visible, even on a tie', () => {
    const rects = [
      { docIndex: 0, pageIndex: 0, top: 0, bottom: 400 },
      { docIndex: 0, pageIndex: 1, top: 420, bottom: 820 },
    ]
    expect(findMostVisiblePage(rects, 900)).toEqual({ docIndex: 0, pageIndex: 0 })
    expect(findMostVisiblePage(rects, 900, { current: { docIndex: 0, pageIndex: 1 } })).toEqual({ docIndex: 0, pageIndex: 1 })
  })

  it('stops keeping the current page once it is partially visible', () => {
    const rects = [
      { docIndex: 0, pageIndex: 0, top: -300, bottom: 100 },
      { docIndex: 0, pageIndex: 1, top: 120, bottom: 520 },
    ]
    expect(findMostVisiblePage(rects, 500, { current: { docIndex: 0, pageIndex: 0 } })).toEqual({ docIndex: 0, pageIndex: 1 })
  })

  it('accounts for horizontal clipping', () => {
    const rects = [
      { docIndex: 0, pageIndex: 0, top: 0, bottom: 300, left: -350, right: 50 },
      { docIndex: 0, pageIndex: 1, top: 320, bottom: 620, left: 0, right: 400 },
    ]
    expect(findMostVisiblePage(rects, 700, { viewWidth: 800 })).toEqual({ docIndex: 0, pageIndex: 1 })
  })

  it('resolves ties to the first page in document order', () => {
    const rects = [
      { docIndex: 0, pageIndex: 0, top: -250, bottom: 250 },
      { docIndex: 0, pageIndex: 1, top: 250, bottom: 750 },
    ]
    expect(findMostVisiblePage(rects, 500)).toEqual({ docIndex: 0, pageIndex: 0 })
  })

  it('treats sub-pixel clipping as fully visible so the current page is kept', () => {
    const rects = [
      { docIndex: 0, pageIndex: 0, top: -0.3, bottom: 99.7 },
      { docIndex: 0, pageIndex: 1, top: 148, bottom: 544 },
    ]
    expect(findMostVisiblePage(rects, 720, { current: { docIndex: 0, pageIndex: 0 } })).toEqual({ docIndex: 0, pageIndex: 0 })
  })
})
