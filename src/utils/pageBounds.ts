// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function getViewportWindow(scrollTop: number, viewHeight: number, margin = 300) {
  return {
    minY: Math.max(0, scrollTop - margin),
    maxY: scrollTop + viewHeight + margin,
  }
}

export function isPageInViewport(offsetTop: number, offsetHeight: number, minY: number, maxY: number) {
  return !(offsetTop + offsetHeight < minY || offsetTop > maxY)
}

export interface PageViewportRect {
  docIndex: number
  pageIndex: number
  /** Top edge relative to the top of the scroll viewport. */
  top: number
  /** Bottom edge relative to the top of the scroll viewport. */
  bottom: number
  /** Left edge relative to the left of the scroll viewport. */
  left?: number
  /** Right edge relative to the left of the scroll viewport. */
  right?: number
}

export interface MostVisiblePageOptions {
  /** Viewport width, used to account for horizontal clipping when `left`/`right` are set. */
  viewWidth?: number
  /** Page that is current right now; it is kept while it remains fully visible. */
  current?: { docIndex: number; pageIndex: number } | null
}

const FULLY_VISIBLE = 0.999

/**
 * Fraction (0..1) of the page that is inside the viewport.
 */
export function getVisibleRatio(rect: PageViewportRect, viewHeight: number, viewWidth?: number) {
  const height = rect.bottom - rect.top
  if (height <= 0) return 0
  const visibleHeight = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0)
  if (visibleHeight <= 0) return 0
  let widthRatio = 1
  if (rect.left !== undefined && rect.right !== undefined && viewWidth !== undefined) {
    const width = rect.right - rect.left
    if (width <= 0) return 0
    const visibleWidth = Math.min(rect.right, viewWidth) - Math.max(rect.left, 0)
    if (visibleWidth <= 0) return 0
    widthRatio = visibleWidth / width
  }
  return (visibleHeight / height) * widthRatio
}

/**
 * Picks the current page like the PDF.js viewer does: the current page is kept
 * while it is fully visible, otherwise the page with the highest visible
 * percentage wins. Ties resolve to the first page in document order.
 */
export function findMostVisiblePage(rects: PageViewportRect[], viewHeight: number, options: MostVisiblePageOptions = {}) {
  const { viewWidth, current } = options
  let best: PageViewportRect | null = null
  let bestRatio = 0
  for (const rect of rects) {
    const ratio = getVisibleRatio(rect, viewHeight, viewWidth)
    if (current && rect.docIndex === current.docIndex && rect.pageIndex === current.pageIndex && ratio >= FULLY_VISIBLE) {
      return { docIndex: rect.docIndex, pageIndex: rect.pageIndex }
    }
    if (ratio > bestRatio) {
      best = rect
      bestRatio = ratio
    }
  }
  return best ? { docIndex: best.docIndex, pageIndex: best.pageIndex } : null
}
