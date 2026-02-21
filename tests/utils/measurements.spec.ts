// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import { getCachedMeasurement } from '../../src/utils/measurements'

describe('measurements', () => {
  it('caches and normalizes canvas measurements', () => {
    const cache: Record<string, { width: number; height: number }> = {}
    const pageRef = {
      getCanvasMeasurement: () => ({
        canvasWidth: 200,
        canvasHeight: 300,
      }),
    }

    const result = getCachedMeasurement(cache, 'page-1', pageRef, 2)
    expect(result).toEqual({ width: 100, height: 150 })
    expect(cache['page-1']).toEqual({ width: 100, height: 150 })
  })

  it('returns cached value on subsequent calls', () => {
    const cache: Record<string, { width: number; height: number }> = {
      cached: { width: 50, height: 60 },
    }
    const pageRef = {
      getCanvasMeasurement: () => ({
        canvasWidth: 200,
        canvasHeight: 300,
      }),
    }

    const result = getCachedMeasurement(cache, 'cached', pageRef, 2)
    expect(result).toEqual({ width: 50, height: 60 })
  })
})
