// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import PDFElements from '../../src/components/PDFElements.vue'

const makeDoc = () => ({
  name: 'doc',
  file: null,
  pdfDoc: null,
  numPages: 2,
  pages: [Promise.resolve(), Promise.resolve()],
  pageWidths: [100, 200],
  pagesScale: [1, 1],
  allObjects: [[], []],
})

const makeWrapper = () => {
  const wrapper = shallowMount(PDFElements, {
    props: {
      initFiles: [],
    },
    global: {
      stubs: {
        PDFPage: true,
        DraggableElement: true,
      },
    },
  })

  const ctx = wrapper.vm as any

  ctx.getPageComponent = vi.fn(() => ({
    getCanvasMeasurement: () => ({ canvasWidth: 100, canvasHeight: 100 }),
  }))

  ctx.getPageCanvasElement = vi.fn(() => ({
    width: 100,
    height: 100,
    getBoundingClientRect: () => ({
      width: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    }),
  }))

  return { wrapper, ctx }
}

describe('PDFElements business rules', () => {
  it('adds object to page with generated id', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0

    vi.spyOn(ctx, 'getPageComponent').mockImplementation((docIndex, pageIndex) => {
      const width = pageIndex === 0 ? 100 : 200
      return {
        getCanvasMeasurement: () => ({ canvasWidth: width, canvasHeight: 100 }),
      }
    })

    const added = ctx.addObjectToPage({
      x: 10,
      y: 10,
      width: 30,
      height: 40,
    })

    expect(added).toBe(true)
    expect(doc.allObjects[0].length).toBe(1)
    expect(doc.allObjects[0][0].id).toMatch(/^obj-/)
    expect(ctx.objectIndexCache[`0-${doc.allObjects[0][0].id}`]).toBe(0)
  })

  it('keeps provided id when unique', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0

    const added = ctx.addObjectToPage({
      id: 'custom-id',
      x: 10,
      y: 10,
      width: 30,
      height: 40,
    })

    expect(added).toBe(true)
    expect(doc.allObjects[0][0].id).toBe('custom-id')
  })

  it('generates a new id when id already exists', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'dup', x: 0, y: 0, width: 10, height: 10 })
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0

    const added = ctx.addObjectToPage({
      id: 'dup',
      x: 10,
      y: 10,
      width: 30,
      height: 40,
    })

    expect(added).toBe(true)
    expect(doc.allObjects[0][1].id).not.toBe('dup')
  })

  it('rejects object outside page bounds', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0

    vi.spyOn(ctx, 'getPageComponent').mockImplementation(() => {
      return {
        getCanvasMeasurement: () => ({ canvasWidth: 100, canvasHeight: 100 }),
      }
    })

    const added = ctx.addObjectToPage({
      x: 90,
      y: 10,
      width: 20,
      height: 20,
    })

    expect(added).toBe(false)
    expect(doc.allObjects[0].length).toBe(0)
  })

  it('moves object to page with max visible area', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 40, height: 40 })
    ctx.pdfDocuments = [doc]

    vi.spyOn(ctx, 'getPageComponent').mockImplementation((docIndex, pageIndex) => {
      const width = pageIndex === 0 ? 100 : 200
      return {
        getCanvasMeasurement: () => ({ canvasWidth: width, canvasHeight: 100 }),
      }
    })

    ctx.updateObject(0, 'a', { x: 150, y: 10 })

    expect(doc.allObjects[0].length).toBe(0)
    expect(doc.allObjects[1].length).toBe(1)
    expect(doc.allObjects[1][0].id).toBe('a')
  })

  it('duplicates object without signer elementId', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({
      id: 'a',
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      signer: {
        element: {
          elementId: 'keep-out',
          name: 'sig',
        },
      },
    })
    ctx.pdfDocuments = [doc]

    vi.spyOn(ctx, 'getPageComponent').mockImplementation(() => {
      return {
        getCanvasMeasurement: () => ({ canvasWidth: 100, canvasHeight: 100 }),
      }
    })

    ctx.duplicateObject(0, 'a')

    expect(doc.allObjects[0].length).toBe(2)
    const duplicated = doc.allObjects[0][1]
    expect(duplicated.id).not.toBe('a')
    expect(duplicated.signer.element.elementId).toBeUndefined()
  })

  it('emits delete-object with doc and page info', () => {
    const { wrapper, ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[1].push({ id: 'b', x: 10, y: 10, width: 20, height: 20 })
    ctx.pdfDocuments = [doc]

    ctx.deleteObject(0, 'b')

    const emitted = wrapper.emitted()['pdf-elements:delete-object']
    expect(emitted?.length).toBe(1)
    expect(emitted?.[0][0]).toEqual({
      object: { id: 'b', x: 10, y: 10, width: 20, height: 20 },
      docIndex: 0,
      pageIndex: 1,
    })
    expect(ctx.objectIndexCache['0-b']).toBeUndefined()
  })

  it('returns normalized coordinates for all objects', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 20, width: 30, height: 40 })
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0

    vi.spyOn(ctx, 'getPageComponent').mockImplementation(() => {
      return {
        getCanvasMeasurement: () => ({ canvasWidth: 100, canvasHeight: 100 }),
      }
    })

    const all = ctx.getAllObjects()
    expect(all.length).toBe(1)
    expect(all[0].normalizedCoordinates).toEqual({
      llx: 10,
      lly: 80,
      ury: 40,
      width: 30,
      height: 40,
    })
  })

  it('moves object to hovered page during drag stop', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 40, height: 40 })
    ctx.pdfDocuments = [doc]
    ctx.draggingInitialMouseOffset = { x: 0, y: 0 }
    ctx.draggingElementShift = { x: 0, y: 0 }

    ctx._pagesBoundingRects = {
      '0-0': {
        docIndex: 0,
        pageIndex: 0,
        rect: { left: 0, right: 100, top: 0, bottom: 100 },
      },
      '0-1': {
        docIndex: 0,
        pageIndex: 1,
        rect: { left: 120, right: 320, top: 0, bottom: 100 },
      },
    }

    vi.spyOn(ctx, 'getPageComponent').mockImplementation((docIndex, pageIndex) => {
      const width = pageIndex === 0 ? 100 : 200
      return {
        getCanvasMeasurement: () => ({ canvasWidth: width, canvasHeight: 100 }),
      }
    })
    vi.spyOn(ctx, 'getDisplayedPageScale').mockReturnValue(1)

    const targetPage = ctx.checkAndMoveObjectPage(0, 'a', 140, 20)

    expect(targetPage).toBe(1)
    expect(doc.allObjects[0].length).toBe(0)
    expect(doc.allObjects[1].length).toBe(1)
  })

  it('emits object-click only when hit within bounds', async () => {
    const { wrapper, ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 20, height: 20 })
    ctx.pdfDocuments = [doc]
    await wrapper.setProps({ emitObjectClick: true })

    vi.spyOn(ctx, 'getPageRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
    })
    vi.spyOn(ctx, 'getDisplayedPageScale').mockReturnValue(1)

    ctx.handleOverlayClick(0, 0, { clientX: 15, clientY: 15 })
    expect(wrapper.emitted()['pdf-elements:object-click']?.length).toBe(1)

    ctx.handleOverlayClick(0, 0, { clientX: 90, clientY: 90 })
    expect(wrapper.emitted()['pdf-elements:object-click']?.length).toBe(1)
  })

  it('finishes adding only when preview is visible and within bounds', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]

    vi.spyOn(ctx, 'getPageComponent').mockImplementation(() => {
      return {
        getCanvasMeasurement: () => ({ canvasWidth: 100, canvasHeight: 100 }),
      }
    })

    ctx.isAddingMode = true
    ctx.previewVisible = true
    ctx.previewElement = { width: 20, height: 20 }
    ctx.previewPageDocIndex = 0
    ctx.previewPageIndex = 0
    ctx.previewPosition = { x: 10, y: 10 }

    ctx.finishAdding()
    expect(doc.allObjects[0].length).toBe(1)

    ctx.isAddingMode = true
    ctx.previewVisible = true
    ctx.previewElement = { width: 20, height: 20 }
    ctx.previewPosition = { x: 90, y: 90 }

    ctx.finishAdding()
    expect(doc.allObjects[0].length).toBe(1)
  })

  it('cancels adding resets preview state', () => {
    const { ctx } = makeWrapper()
    ctx.isAddingMode = true
    ctx.previewElement = { width: 10, height: 10 }
    ctx.previewVisible = true

    ctx.cancelAdding()

    expect(ctx.isAddingMode).toBe(false)
    expect(ctx.previewElement).toBeNull()
    expect(ctx.previewVisible).toBe(false)
  })

  it('cancels adding on escape key', () => {
    const { ctx } = makeWrapper()
    ctx.isAddingMode = true
    ctx.previewElement = { width: 10, height: 10 }
    ctx.previewVisible = true

    ctx.handleKeyDown({ key: 'Escape' })

    expect(ctx.isAddingMode).toBe(false)
  })

  it('starts adding element and prepares preview state', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]

    const attachSpy = vi.spyOn(ctx, 'attachAddingListeners')

    ctx.startAddingElement({ width: 10, height: 10 })

    expect(attachSpy).toHaveBeenCalled()
    expect(ctx.isAddingMode).toBe(true)
    expect(ctx.previewElement).toEqual({ width: 10, height: 10 })
    expect(ctx.previewPageDocIndex).toBe(0)
    expect(ctx.previewPageIndex).toBe(0)
  })

  it('does not update object when out of bounds on same page', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 30, height: 30 })
    ctx.pdfDocuments = [doc]

    vi.spyOn(ctx, 'getPageComponent').mockImplementation(() => {
      return {
        getCanvasMeasurement: () => ({ canvasWidth: 100, canvasHeight: 100 }),
      }
    })

    ctx.updateObject(0, 'a', { x: -5, y: -5 })

    expect(doc.allObjects[0][0].x).toBe(10)
    expect(doc.allObjects[0][0].y).toBe(10)
  })

  it('updates object within bounds on same page', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 20, height: 20 })
    ctx.pdfDocuments = [doc]

    ctx.updateObject(0, 'a', { x: 30, y: 40 })

    expect(doc.allObjects[0][0].x).toBe(30)
    expect(doc.allObjects[0][0].y).toBe(40)
  })

  it('updates object position during global drag', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 0, y: 0, width: 20, height: 20 })
    ctx.pdfDocuments = [doc]
    ctx.draggingElementShift = { x: 0, y: 0 }
    ctx.draggingInitialMouseOffset = { x: 0, y: 0 }

    vi.spyOn(ctx, 'getPageRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
    })
    vi.spyOn(ctx, 'getDisplayedPageScale').mockReturnValue(1)

    ctx.updateObject(0, 'a', {
      _globalDrag: true,
      _mouseX: 30,
      _mouseY: 40,
    })

    expect(doc.allObjects[0][0].x).toBe(30)
    expect(doc.allObjects[0][0].y).toBe(40)
  })

  it('keeps object on same page when dragged within page bounds', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 20, height: 20 })
    ctx.pdfDocuments = [doc]
    ctx.draggingInitialMouseOffset = { x: 0, y: 0 }
    ctx.draggingElementShift = { x: 0, y: 0 }

    ctx._pagesBoundingRects = {
      '0-0': {
        docIndex: 0,
        pageIndex: 0,
        rect: { left: 0, right: 100, top: 0, bottom: 100 },
      },
    }

    vi.spyOn(ctx, 'getDisplayedPageScale').mockReturnValue(1)

    const targetPage = ctx.checkAndMoveObjectPage(0, 'a', 30, 30)

    expect(targetPage).toBe(0)
    expect(doc.allObjects[0][0].x).toBe(30)
    expect(doc.allObjects[0][0].y).toBe(30)
  })

  it('clamps moved object when changing pages', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.allObjects[0].push({ id: 'a', x: 10, y: 10, width: 50, height: 50 })
    ctx.pdfDocuments = [doc]
    ctx.draggingInitialMouseOffset = { x: 0, y: 0 }
    ctx.draggingElementShift = { x: 0, y: 0 }

    ctx._pagesBoundingRects = {
      '0-1': {
        docIndex: 0,
        pageIndex: 1,
        rect: { left: 0, right: 80, top: 0, bottom: 80 },
      },
    }

    vi.spyOn(ctx, 'getDisplayedPageScale').mockReturnValue(1)

    const targetPage = ctx.checkAndMoveObjectPage(0, 'a', 70, 70)

    expect(targetPage).toBe(1)
    expect(doc.allObjects[1][0].x).toBe(50)
    expect(doc.allObjects[1][0].y).toBe(50)
  })

  it('formats page numbers using format string', async () => {
    const { wrapper, ctx } = makeWrapper()
    await wrapper.setProps({ pageCountFormat: 'Page {currentPage} / {totalPages}' })

    const label = ctx.formatPageNumber(2, 5)

    expect(label).toBe('Page 2 / 5')
  })

  it('calculates optimal scale based on container width', () => {
    const { wrapper, ctx } = makeWrapper()
    Object.defineProperty(wrapper.element, 'clientWidth', {
      value: 500,
      configurable: true,
    })

    const scale = ctx.calculateOptimalScale(400)

    expect(scale).toBeCloseTo((500 - 40) / 400)
  })

  it('adjusts zoom to fit and updates scales', async () => {
    const { wrapper, ctx } = makeWrapper()
    const doc = makeDoc()
    doc.pageWidths = [100, 200]
    ctx.pdfDocuments = [doc]
    await wrapper.setProps({ autoFitZoom: true })
    ctx.scale = 1
    ctx.visualScale = 1

    Object.defineProperty(wrapper.element, 'clientWidth', {
      value: 500,
      configurable: true,
    })

    ctx.adjustZoomToFit()

    expect(ctx.autoFitApplied).toBe(true)
    expect(ctx.scale).toBe(2)
    expect(ctx.visualScale).toBe(2)
    expect(ctx.pdfDocuments[0].pagesScale).toEqual([2, 2])
  })

  it('commits zoom and applies scale to documents', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]
    ctx.visualScale = 1.6

    ctx.commitZoom()

    expect(ctx.scale).toBe(1.6)
    expect(ctx.pdfDocuments[0].pagesScale).toEqual([1.6, 1.6])
  })

  it('does not schedule auto-fit twice', () => {
    const { ctx } = makeWrapper()
    ctx.autoFitApplied = false
    ctx.zoomRafId = 123

    ctx.scheduleAutoFitZoom()

    expect(ctx.zoomRafId).toBe(123)
  })

  it('schedules auto-fit when page widths are missing', async () => {
    const { wrapper, ctx } = makeWrapper()
    const doc = makeDoc()
    doc.pageWidths = [0, 0]
    ctx.pdfDocuments = [doc]
    await wrapper.setProps({ autoFitZoom: true })

    Object.defineProperty(wrapper.element, 'clientWidth', {
      value: 440,
      configurable: true,
    })

    const scheduleSpy = vi.spyOn(ctx, 'scheduleAutoFitZoom')

    ctx.adjustZoomToFit()

    expect(scheduleSpy).toHaveBeenCalled()
    expect(ctx.autoFitApplied).toBe(false)
  })

  it('uses displayed scale based on visual scale factor', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.pageWidths = [100, 100]
    doc.pagesScale = [1, 1]
    ctx.pdfDocuments = [doc]
    ctx.scale = 1
    ctx.visualScale = 1.5

    ctx.getPageCanvasElement = vi.fn(() => ({
      width: 0,
      height: 0,
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      }),
    }))

    const scale = ctx.getDisplayedPageScale(0, 0)

    expect(scale).toBe(1.5)
  })

  it('prefers per-page scale when no rect width is available', () => {
    const { ctx } = makeWrapper()
    const doc = makeDoc()
    doc.pagesScale = [1.2, 1.4]
    ctx.pdfDocuments = [doc]
    ctx.scale = 1
    ctx.visualScale = 1

    ctx.getPageCanvasElement = vi.fn(() => null)

    const scale = ctx.getDisplayedPageScale(0, 1)

    expect(scale).toBe(1.4)
  })
})
