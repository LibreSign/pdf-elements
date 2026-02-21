// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import { clampPosition, getVisibleArea } from '../../src/utils/geometry'

describe('geometry', () => {
  it('clamps position within bounds', () => {
    const result = clampPosition(-10, 200, 50, 60, 300, 180)
    expect(result).toEqual({ x: 0, y: 120 })
  })

  it('calculates visible area for overlapping rectangle', () => {
    const area = getVisibleArea(-10, -10, 40, 50, 100, 100)
    expect(area).toBe(30 * 40)
  })

  it('returns zero when fully outside', () => {
    const area = getVisibleArea(120, 120, 30, 30, 100, 100)
    expect(area).toBe(0)
  })
})
