// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface CanvasMeasurement {
  canvasWidth: number
  canvasHeight: number
}

export interface PageMeasurement {
  width: number
  height: number
}

export interface PageMeasurementProvider {
  getCanvasMeasurement: () => CanvasMeasurement
}

export function getCachedMeasurement(
  cache: Record<string, PageMeasurement>,
  cacheKey: string,
  pageRef: PageMeasurementProvider,
  pagesScale: number
) {
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
