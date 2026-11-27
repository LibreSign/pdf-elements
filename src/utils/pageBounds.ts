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
}

/**
 * Returns the page occupying the largest visible area of the viewport.
 * Ties resolve to the first page in document order.
 */
export function findMostVisiblePage(rects: PageViewportRect[], viewHeight: number) {
  let best: PageViewportRect | null = null
  let bestVisible = 0
  for (const rect of rects) {
    const visible = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0)
    if (visible > bestVisible) {
      best = rect
      bestVisible = visible
    }
  }
  return best ? { docIndex: best.docIndex, pageIndex: best.pageIndex } : null
}
