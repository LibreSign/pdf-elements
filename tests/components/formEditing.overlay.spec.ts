// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import PDFElements from '../../src/components/PDFElements.vue'
import {
  createFormEditor,
  createFormEditorOverlayAdapter,
} from '../../src/utils/formEditing'

const makeDoc = () => ({
  name: 'doc',
  file: null,
  pdfDoc: null,
  numPages: 2,
  pages: [Promise.resolve(), Promise.resolve()],
  pageWidths: [300, 300],
  pagesScale: [1, 1],
  allObjects: [[], []] as Record<string, unknown>[][],
})

describe('form editing over PDFElements overlay API', () => {
  it('places and moves form widgets through the public overlay methods', () => {
    const wrapper = shallowMount(PDFElements, {
      props: { initFiles: [] },
      global: {
        stubs: {
          PDFPage: true,
          DraggableElement: true,
        },
      },
    })

    const ctx = wrapper.vm as any
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0
    ctx.getPageComponent = vi.fn(() => ({
      getCanvasMeasurement: () => ({ canvasWidth: 300, canvasHeight: 400 }),
    }))
    ctx.getPageCanvasElement = vi.fn(() => ({
      width: 300,
      height: 400,
      getBoundingClientRect: () => ({
        width: 300,
        height: 400,
        left: 0,
        right: 300,
        top: 0,
        bottom: 400,
      }),
    }))

    const editor = createFormEditor({
      overlay: createFormEditorOverlayAdapter(ctx),
    })

    const field = editor.createField({
      type: 'text',
      name: 'address',
      required: true,
    })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 20,
      y: 30,
      width: 100,
      height: 24,
    })

    expect(doc.allObjects[0]).toHaveLength(1)
    expect(doc.allObjects[0][0]).toMatchObject({
      id: widget.elementId,
      type: 'text',
      label: 'address',
      x: 20,
      y: 30,
    })

    editor.updateWidget(widget.id, { x: 40, y: 50 })
    expect(doc.allObjects[0][0]).toMatchObject({ x: 40, y: 50 })

    editor.syncFromOverlay(
      { ...doc.allObjects[0][0], x: 60, y: 70 } as any,
      { pageIndex: 0, docIndex: 0 }
    )
    expect(editor.getWidget(widget.id)).toMatchObject({ x: 60, y: 70 })

    // Non-form overlay remains independent of the form model.
    expect(
      ctx.addObjectToPage({
        id: 'signature-1',
        type: 'signature',
        x: 10,
        y: 10,
        width: 80,
        height: 40,
      })
    ).toBe(true)
    expect(doc.allObjects[0]).toHaveLength(2)
    expect(editor.getModel().widgets).toHaveLength(1)

    // Existing elementId links in place (migration) without duplicating the rectangle.
    doc.allObjects[0].push({
      id: 'annotation',
      x: 1,
      y: 1,
      width: 12,
      height: 12,
      type: 'marker',
    })
    const linked = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 12,
      height: 12,
      elementId: 'annotation',
    })
    expect(linked.elementId).toBe('annotation')
    expect(doc.allObjects[0].filter((object) => object.id === 'annotation')).toHaveLength(1)

    editor.removeWidget(widget.id)
    editor.removeWidget(linked.id, { syncOverlay: false })
    expect(doc.allObjects[0].some((object) => object.id === 'signature-1')).toBe(true)
    expect(doc.allObjects[0].some((object) => object.id === 'annotation')).toBe(true)
    expect(doc.allObjects[0].some((object) => object.id === widget.elementId)).toBe(false)
  })

  it('rolls back model geometry when PDFElements rejects an out-of-bounds update', () => {
    const wrapper = shallowMount(PDFElements, {
      props: { initFiles: [] },
      global: {
        stubs: {
          PDFPage: true,
          DraggableElement: true,
        },
      },
    })

    const ctx = wrapper.vm as any
    const doc = makeDoc()
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0
    ctx.getPageComponent = vi.fn(() => ({
      getCanvasMeasurement: () => ({ canvasWidth: 300, canvasHeight: 400 }),
    }))
    ctx.getPageCanvasElement = vi.fn(() => ({
      width: 300,
      height: 400,
      getBoundingClientRect: () => ({
        width: 300,
        height: 400,
        left: 0,
        right: 300,
        top: 0,
        bottom: 400,
      }),
    }))
    ctx.getPageSize = vi.fn(() => ({ width: 300, height: 400 }))
    ctx.getPageWidth = vi.fn(() => 300)
    ctx.getPageHeight = vi.fn(() => 400)

    const editor = createFormEditor({
      overlay: createFormEditorOverlayAdapter(ctx),
    })
    const field = editor.createField({ type: 'text', name: 'bounds' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    })

    expect(() => editor.updateWidget(widget.id, { x: -1 })).toThrow(/rejected geometry/)
    expect(editor.getWidget(widget.id)?.x).toBe(10)
    expect(doc.allObjects[0][0]).toMatchObject({ x: 10, y: 10 })
  })

  it('restores overlay page membership after a rejected cross-page spill', () => {
    const wrapper = shallowMount(PDFElements, {
      props: { initFiles: [] },
      global: {
        stubs: {
          PDFPage: true,
          DraggableElement: true,
        },
      },
    })

    const ctx = wrapper.vm as any
    const doc = makeDoc()
    doc.pageWidths = [300, 600]
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0
    ctx.getPageComponent = vi.fn((_docIndex: number, pageIndex: number) => ({
      getCanvasMeasurement: () => ({
        canvasWidth: pageIndex === 0 ? 300 : 600,
        canvasHeight: 400,
      }),
    }))
    ctx.getPageCanvasElement = vi.fn(() => ({
      width: 300,
      height: 400,
      getBoundingClientRect: () => ({
        width: 300,
        height: 400,
        left: 0,
        right: 300,
        top: 0,
        bottom: 400,
      }),
    }))
    ctx.getPageSize = vi.fn((_docIndex: number, pageIndex: number) => ({
      width: pageIndex === 0 ? 300 : 600,
      height: 400,
    }))
    ctx.getPageWidth = vi.fn((_docIndex: number, pageIndex: number) => (
      pageIndex === 0 ? 300 : 600
    ))
    ctx.getPageHeight = vi.fn(() => 400)

    const overlay = createFormEditorOverlayAdapter(ctx)
    const editor = createFormEditor({ overlay })
    const field = editor.createField({ type: 'text', name: 'spill' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    })

    const deleteSpy = vi.spyOn(ctx, 'deleteObject')
    const moveSpy = vi.spyOn(ctx, 'moveObjectToPage')

    expect(() => editor.updateWidget(widget.id, { x: 400 })).toThrow(/rejected geometry/)
    expect(editor.getWidget(widget.id)).toMatchObject({
      x: 10,
      y: 10,
      pageIndex: 0,
    })
    expect(editor.getWidgetsForField(field.id)).toHaveLength(1)
    // Silent page restore: hosts listening for delete-object must not see a user delete.
    expect(moveSpy).toHaveBeenCalledWith(
      0,
      widget.elementId,
      0,
      expect.objectContaining({ x: 10, y: 10, width: 20, height: 20 })
    )
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(wrapper.emitted()['pdf-elements:delete-object']).toBeUndefined()
    expect(doc.allObjects[0].some((object) => object.id === widget.elementId)).toBe(true)
    expect(doc.allObjects[1].some((object) => object.id === widget.elementId)).toBe(false)
    expect(doc.allObjects[0].find((object) => object.id === widget.elementId)).toMatchObject({
      x: 10,
      y: 10,
    })
  })

  it('keeps the widget when a delete-object host handler is wired during spill restore', () => {
    const wrapper = shallowMount(PDFElements, {
      props: { initFiles: [] },
      global: {
        stubs: {
          PDFPage: true,
          DraggableElement: true,
        },
      },
    })

    const ctx = wrapper.vm as any
    const doc = makeDoc()
    doc.pageWidths = [300, 600]
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0
    ctx.getPageComponent = vi.fn((_docIndex: number, pageIndex: number) => ({
      getCanvasMeasurement: () => ({
        canvasWidth: pageIndex === 0 ? 300 : 600,
        canvasHeight: 400,
      }),
    }))
    ctx.getPageCanvasElement = vi.fn(() => ({
      width: 300,
      height: 400,
      getBoundingClientRect: () => ({
        width: 300,
        height: 400,
        left: 0,
        right: 300,
        top: 0,
        bottom: 400,
      }),
    }))
    ctx.getPageSize = vi.fn((_docIndex: number, pageIndex: number) => ({
      width: pageIndex === 0 ? 300 : 600,
      height: 400,
    }))
    ctx.getPageWidth = vi.fn((_docIndex: number, pageIndex: number) => (
      pageIndex === 0 ? 300 : 600
    ))
    ctx.getPageHeight = vi.fn(() => 400)

    const overlay = createFormEditorOverlayAdapter(ctx)
    const editor = createFormEditor({ overlay })
    const field = editor.createField({ type: 'text', name: 'spill-host' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    })

    // Simulate a compliant host that removes widgets on delete-object.
    // If rollback used deleteObject, this would empty the model mid-restore.
    const removeOnDelete = vi.fn((objectId: string) => {
      if (overlay.isInternalMutation?.()) return
      const target = editor.getWidgetByElementId(objectId, 0)
      if (target) editor.removeWidget(target.id)
    })
    const originalDelete = ctx.deleteObject.bind(ctx)
    ctx.deleteObject = (docIndex: number, objectId: string) => {
      originalDelete(docIndex, objectId)
      removeOnDelete(objectId)
    }

    expect(() => editor.updateWidget(widget.id, { x: 400 })).toThrow(/rejected geometry/)
    expect(removeOnDelete).not.toHaveBeenCalled()
    expect(editor.getWidgetsForField(field.id)).toEqual([
      expect.objectContaining({ id: widget.id, x: 10, pageIndex: 0 }),
    ])
  })

  it('recovers a rewritten overlay id when placeWidget collides on PDFElements', () => {
    const wrapper = shallowMount(PDFElements, {
      props: { initFiles: [] },
      global: {
        stubs: {
          PDFPage: true,
          DraggableElement: true,
        },
      },
    })

    const ctx = wrapper.vm as any
    const doc = makeDoc()
    doc.allObjects[0].push({
      id: 'annotation',
      x: 0,
      y: 0,
      width: 12,
      height: 12,
      type: 'marker',
    })
    ctx.pdfDocuments = [doc]
    ctx.selectedDocIndex = 0
    ctx.selectedPageIndex = 0
    ctx.objectIndexCache = { '0-annotation': 0 }
    ctx.getPageComponent = vi.fn(() => ({
      getCanvasMeasurement: () => ({ canvasWidth: 300, canvasHeight: 400 }),
    }))
    ctx.getPageCanvasElement = vi.fn(() => ({
      width: 300,
      height: 400,
      getBoundingClientRect: () => ({
        width: 300,
        height: 400,
        left: 0,
        right: 300,
        top: 0,
        bottom: 400,
      }),
    }))

    // Bypass hasObject linking so addObjectToPage must rewrite the colliding id.
    const stock = createFormEditorOverlayAdapter(ctx)
    const editor = createFormEditor({
      overlay: {
        ...stock,
        hasObject: undefined,
      },
    })
    const field = editor.createField({ type: 'text', name: 'collide' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 20,
      y: 20,
      width: 30,
      height: 18,
      elementId: 'annotation',
    })

    expect(widget.elementId).not.toBe('annotation')
    expect(doc.allObjects[0].some((object) => object.id === 'annotation')).toBe(true)
    expect(doc.allObjects[0].some((object) => object.id === widget.elementId)).toBe(true)

    editor.removeWidget(widget.id)
    expect(doc.allObjects[0].some((object) => object.id === 'annotation')).toBe(true)
    expect(doc.allObjects[0].some((object) => object.id === widget.elementId)).toBe(false)
  })
})
