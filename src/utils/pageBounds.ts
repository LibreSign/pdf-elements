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
