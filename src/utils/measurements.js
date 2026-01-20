// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function getCachedMeasurement(cache, cacheKey, pageRef, pagesScale) {
  const cached = cache[cacheKey]
  if (cached) {
    return cached
  }
  const measurement = pageRef.getCanvasMeasurement()
  const normalized = {
    width: measurement.canvasWidth / pagesScale,
    height: measurement.canvasHeight / pagesScale,
  }
  cache[cacheKey] = normalized
  return normalized
}
