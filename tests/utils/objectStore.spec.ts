// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import {
  objectIdExistsInDoc,
  findObjectPageIndex,
  updateObjectInDoc,
  removeObjectFromDoc,
} from '../../src/utils/objectStore'

const makeDoc = () => ({
  name: 'doc',
  file: null,
  pdfDoc: null,
  numPages: 2,
  pages: [Promise.resolve(), Promise.resolve()],
  pageWidths: [100, 100],
  pagesScale: [1, 1],
  allObjects: [
    [{ id: 'a', x: 0, y: 0, width: 10, height: 10 }],
    [{ id: 'b', x: 5, y: 5, width: 20, height: 20 }],
  ],
})

describe('objectStore', () => {
  it('checks if object id exists', () => {
    const doc = makeDoc()
    expect(objectIdExistsInDoc(doc, 'a')).toBe(true)
    expect(objectIdExistsInDoc(doc, 'missing')).toBe(false)
  })

  it('finds object page index', () => {
    const doc = makeDoc()
    expect(findObjectPageIndex(doc, 'b')).toBe(1)
    expect(findObjectPageIndex(doc, 'missing')).toBeUndefined()
  })

  it('updates object in doc', () => {
    const doc = makeDoc()
    const updated = updateObjectInDoc(doc, 0, 'a', { x: 12 })
    expect(updated).toBe(true)
    expect(doc.allObjects[0][0].x).toBe(12)
  })

  it('removes object from doc', () => {
    const doc = makeDoc()
    const removed = removeObjectFromDoc(doc, 1, 'b')
    expect(removed).toBe(true)
    expect(doc.allObjects[1].length).toBe(0)
  })
})
