// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number
) {
  return {
    x: Math.max(0, Math.min(x, pageWidth - width)),
    y: Math.max(0, Math.min(y, pageHeight - height)),
  }
}

export function getVisibleArea(
  newX: number,
  newY: number,
  objWidth: number,
  objHeight: number,
  pageWidth: number,
  pageHeight: number
) {
  const visibleLeft = Math.max(0, newX)
  const visibleTop = Math.max(0, newY)
  const visibleRight = Math.min(pageWidth, newX + objWidth)
  const visibleBottom = Math.min(pageHeight, newY + objHeight)
  if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
    return 0
  }
  return (visibleRight - visibleLeft) * (visibleBottom - visibleTop)
}
