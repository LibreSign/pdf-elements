// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import { applyScaleToDocs } from '../../src/utils/zoom'

const makeDoc = () => ({
  name: 'doc',
  file: null,
  pdfDoc: null,
  numPages: 2,
  pages: [Promise.resolve(), Promise.resolve()],
  pageWidths: [100, 100],
  pagesScale: [1, 2],
  allObjects: [[], []],
})

describe('zoom', () => {
  it('applies scale to all document pages', () => {
    const docs = [makeDoc(), makeDoc()]
    applyScaleToDocs(docs, 1.5)
    expect(docs[0].pagesScale).toEqual([1.5, 1.5])
    expect(docs[1].pagesScale).toEqual([1.5, 1.5])
  })
})
