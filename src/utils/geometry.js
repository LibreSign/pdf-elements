// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function clampPosition(x, y, width, height, pageWidth, pageHeight) {
  return {
    x: Math.max(0, Math.min(x, pageWidth - width)),
    y: Math.max(0, Math.min(y, pageHeight - height)),
  }
}

export function getVisibleArea(newX, newY, objWidth, objHeight, pageWidth, pageHeight) {
  const visibleLeft = Math.max(0, newX)
  const visibleTop = Math.max(0, newY)
  const visibleRight = Math.min(pageWidth, newX + objWidth)
  const visibleBottom = Math.min(pageHeight, newY + objHeight)
  if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
    return 0
  }
  return (visibleRight - visibleLeft) * (visibleBottom - visibleTop)
}
