// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest'
import type { PDFElementObject } from '../../src/types'
import { createFormEditor } from '../../src/utils/formEditing'
import {
  serializeFormModel,
  validateFormModelRelationships,
} from '../../src/utils/formModel'

function createOverlayAdapter(options: { rewriteIds?: boolean } = {}) {
  const objects: PDFElementObject[] = []
  return {
    objects,
    adapter: {
      addObjectToPage: vi.fn((object: PDFElementObject) => {
        const requestedId = object.id
        const id = options.rewriteIds
          || (requestedId && objects.some((entry) => entry.id === requestedId))
          ? `obj-rewritten-${objects.length + 1}`
          : (requestedId ?? `obj-${objects.length + 1}`)
        const placed = { ...object, id }
        objects.push(placed)
        return placed
      }),
      hasObject: vi.fn((docIndex: number, objectId: string) => {
        void docIndex
        return objects.some((entry) => entry.id === objectId)
      }),
      updateObject: vi.fn((docIndex: number, objectId: string, payload: Partial<PDFElementObject>) => {
        void docIndex
        const target = objects.find((entry) => entry.id === objectId)
        if (!target) return false
        if (typeof payload.x === 'number' && payload.x < 0) return false
        Object.assign(target, payload)
      }),
      deleteObject: vi.fn((docIndex: number, objectId: string) => {
        void docIndex
        const index = objects.findIndex((entry) => entry.id === objectId)
        if (index >= 0) objects.splice(index, 1)
      }),
      startAddingElement: vi.fn(),
      cancelAdding: vi.fn(),
    },
  }
}

describe('createFormEditor', () => {
  it('creates fields and places multiple widgets without mixing property levels', () => {
    const editor = createFormEditor()
    const field = editor.createField({
      type: 'radio',
      name: 'color',
      options: [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
      ],
      required: true,
    })

    const first = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      x: 10,
      y: 20,
      width: 16,
      height: 16,
      exportValue: 'red',
    })
    const second = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 2,
      docIndex: 0,
      x: 40,
      y: 80,
      width: 16,
      height: 16,
      exportValue: 'blue',
    })

    expect(field).not.toHaveProperty('x')
    expect(field).not.toHaveProperty('pageIndex')
    expect(first).not.toHaveProperty('value')
    expect(first).not.toHaveProperty('required')
    expect(editor.getWidgetsForField(field.id)).toHaveLength(2)
    expect(first.fieldId).toBe(field.id)
    expect(second.fieldId).toBe(field.id)
    expect(validateFormModelRelationships(editor.getModel())).toEqual([])
  })

  it('edits shared field properties and widget-specific properties separately', () => {
    const editor = createFormEditor()
    const field = editor.createField({
      type: 'dropdown',
      name: 'city',
      options: [{ value: 'sp', label: 'São Paulo' }],
    })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      x: 1,
      y: 2,
      width: 100,
      height: 24,
      exportValue: 'sp',
    })

    editor.updateField(field.id, {
      value: 'sp',
      required: true,
      readOnly: false,
      options: [
        { value: 'sp', label: 'São Paulo' },
        { value: 'rj', label: 'Rio' },
      ],
    })
    editor.updateWidget(widget.id, {
      x: 15,
      y: 30,
      width: 140,
      exportValue: 'rj',
    })

    expect(editor.getField(field.id)).toMatchObject({
      value: 'sp',
      required: true,
      readOnly: false,
    })
    expect(editor.getField(field.id)?.options).toHaveLength(2)
    expect(editor.getWidget(widget.id)).toMatchObject({
      x: 15,
      y: 30,
      width: 140,
      exportValue: 'rj',
    })
    expect(editor.getField(field.id)).not.toHaveProperty('x')
    expect(editor.getWidget(widget.id)).not.toHaveProperty('value')
  })

  it('selects fields and widgets while keeping one field linked to many widgets', () => {
    const editor = createFormEditor()
    const field = editor.createField({ type: 'checkbox', name: 'accept' })
    const first = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      x: 0,
      y: 0,
      width: 12,
      height: 12,
    })
    const second = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 1,
      x: 0,
      y: 0,
      width: 12,
      height: 12,
    })

    expect(editor.selectField(field.id)).toEqual({
      fieldId: field.id,
      widgetId: null,
    })
    expect(editor.selectWidget(second.id)).toEqual({
      fieldId: field.id,
      widgetId: second.id,
    })

    editor.removeWidget(first.id)
    expect(editor.getSelection()).toEqual({
      fieldId: field.id,
      widgetId: second.id,
    })
    expect(editor.getWidgetsForField(field.id)).toEqual([
      expect.objectContaining({ id: second.id }),
    ])
  })

  it('syncs overlay placement, geometry updates and deletion through the adapter', () => {
    const { adapter, objects } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'full-name' })

    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 10,
      y: 20,
      width: 120,
      height: 24,
    })

    expect(objects).toHaveLength(1)
    expect(widget.elementId).toBe(objects[0].id)
    expect(objects[0]).toMatchObject({
      type: 'text',
      label: 'full-name',
      x: 10,
      y: 20,
      width: 120,
      height: 24,
    })

    editor.updateWidget(widget.id, { x: 50, y: 60, width: 200 })
    expect(adapter.updateObject).toHaveBeenCalledWith(0, widget.elementId, {
      x: 50,
      y: 60,
      width: 200,
      height: 24,
    })

    editor.updateField(field.id, { name: 'legal-name', type: 'text' })
    expect(adapter.updateObject).toHaveBeenCalledWith(0, widget.elementId, {
      type: 'text',
      label: 'legal-name',
    })

    const moved = editor.syncFromOverlay(
      { id: widget.elementId!, x: 70, y: 90, width: 180, height: 30 },
      { pageIndex: 1, docIndex: 0 }
    )
    expect(moved).toMatchObject({
      id: widget.id,
      x: 70,
      y: 90,
      width: 180,
      height: 30,
      pageIndex: 1,
      docIndex: 0,
    })

    editor.removeField(field.id)
    expect(adapter.deleteObject).toHaveBeenCalledWith(0, widget.elementId)
    expect(objects).toHaveLength(0)
    expect(editor.getModel()).toEqual({ fields: [], widgets: [] })
  })

  it('completes interactive placement without duplicating the overlay object', () => {
    const { adapter, objects } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'title' })

    editor.beginPlaceWidget({
      fieldId: field.id,
      width: 160,
      height: 28,
      exportValue: 'draft',
    })
    expect(editor.isPlacingWidget()).toBe(true)
    expect(adapter.startAddingElement).toHaveBeenCalledTimes(1)

    const placedObject: PDFElementObject = {
      id: 'obj-placed',
      x: 12,
      y: 34,
      width: 160,
      height: 28,
      type: 'text',
      label: 'title',
    }
    objects.push(placedObject)

    const widget = editor.completeWidgetPlacement({
      object: placedObject,
      pageIndex: 0,
      docIndex: 0,
    })

    expect(editor.isPlacingWidget()).toBe(false)
    expect(widget).toMatchObject({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 12,
      y: 34,
      width: 160,
      height: 28,
      exportValue: 'draft',
      elementId: 'obj-placed',
    })
    expect(objects).toHaveLength(1)
    expect(adapter.addObjectToPage).not.toHaveBeenCalled()
  })

  it('cancels interactive placement and leaves the model unchanged', () => {
    const { adapter } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'notes' })

    editor.beginPlaceWidget({ fieldId: field.id })
    editor.cancelPlaceWidget()

    expect(editor.isPlacingWidget()).toBe(false)
    expect(adapter.cancelAdding).toHaveBeenCalledTimes(1)
    expect(editor.getWidgetsForField(field.id)).toEqual([])
  })

  it('keeps model-only editing working without an overlay adapter', () => {
    const editor = createFormEditor()
    const field = editor.createField({ type: 'unknown-custom', name: 'x' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
    })

    editor.updateWidget(widget.id, { x: 5 })
    expect(editor.getWidget(widget.id)?.x).toBe(5)
    expect(editor.getSnapshot()).toEqual(serializeFormModel(editor.getModel()))
  })

  it('does not attach form editing state to Vue-like hosts', () => {
    const editor = createFormEditor()
    expect(editor).not.toHaveProperty('$')
    expect(editor).not.toHaveProperty('_isVue')
    expect(typeof editor.getModel).toBe('function')
  })

  it('keeps widget.elementId on the stored overlay id after collisions', () => {
    const objects: PDFElementObject[] = [{
      id: 'annotation',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      type: 'signature',
    }]
    // No hasObject: simulates a host that only returns the stored object after rewrite.
    const adapter = {
      addObjectToPage: vi.fn((object: PDFElementObject) => {
        const id = objects.some((entry) => entry.id === object.id)
          ? `obj-rewritten-${objects.length + 1}`
          : (object.id ?? `obj-${objects.length + 1}`)
        const placed = { ...object, id }
        objects.push(placed)
        return placed
      }),
      deleteObject: vi.fn((docIndex: number, objectId: string) => {
        void docIndex
        const index = objects.findIndex((entry) => entry.id === objectId)
        if (index >= 0) objects.splice(index, 1)
      }),
    }
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'name' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 5,
      y: 5,
      width: 40,
      height: 16,
      elementId: 'annotation',
    })

    expect(widget.elementId).not.toBe('annotation')
    expect(widget.elementId).toBe(objects[1].id)
    expect(objects).toHaveLength(2)

    editor.removeWidget(widget.id)
    expect(objects.some((entry) => entry.id === 'annotation')).toBe(true)
    expect(objects).toHaveLength(1)
  })

  it('links to an existing overlay without inserting a duplicate', () => {
    const { adapter, objects } = createOverlayAdapter()
    objects.push({
      id: 'existing-field',
      x: 8,
      y: 9,
      width: 50,
      height: 20,
      type: 'text',
    })
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'migrated' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 8,
      y: 9,
      width: 50,
      height: 20,
      elementId: 'existing-field',
    })

    expect(widget.elementId).toBe('existing-field')
    expect(objects).toHaveLength(1)
    expect(adapter.addObjectToPage).not.toHaveBeenCalled()
  })

  it('cancels overlay adding when loadModel replaces the session', () => {
    const { adapter } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'a' })
    editor.beginPlaceWidget({ fieldId: field.id })
    expect(editor.isPlacingWidget()).toBe(true)

    editor.loadModel({ fields: [], widgets: [] })
    expect(editor.isPlacingWidget()).toBe(false)
    expect(adapter.cancelAdding).toHaveBeenCalled()
    expect(editor.getModel()).toEqual({ fields: [], widgets: [] })
  })

  it('rejects createField widgetIds and page moves while syncing overlay', () => {
    const { adapter } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })

    expect(() => editor.createField({
      type: 'text',
      name: 'broken',
      widgetIds: ['ghost'],
    })).toThrow(/widgetIds/)

    const field = editor.createField({ type: 'text', name: 'ok' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
    })

    expect(() => editor.updateWidget(widget.id, { pageIndex: 1 })).toThrow(/pageIndex\/docIndex/)
    editor.updateWidget(widget.id, { pageIndex: 1 }, { syncOverlay: false })
    expect(editor.getWidget(widget.id)?.pageIndex).toBe(1)
  })

  it('rolls back geometry when the overlay rejects an update', () => {
    const { adapter } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'geo' })
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
  })

  it('preserves bridge type/label overrides when updating field appearance', () => {
    const { adapter, objects } = createOverlayAdapter()
    const editor = createFormEditor({
      overlay: adapter,
      bridgeOptions: { type: 'custom-box', label: 'Fixed' },
    })
    const field = editor.createField({ type: 'text', name: 'raw' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
    })

    expect(objects[0]).toMatchObject({
      id: widget.elementId,
      type: 'custom-box',
      label: 'Fixed',
    })

    editor.updateField(field.id, { name: 'renamed', type: 'dropdown' })
    expect(adapter.updateObject).not.toHaveBeenCalledWith(
      0,
      widget.elementId,
      expect.objectContaining({ type: 'dropdown' })
    )
    expect(adapter.updateObject).not.toHaveBeenCalledWith(
      0,
      widget.elementId,
      expect.objectContaining({ label: 'renamed' })
    )
  })

  it('preserves per-widget bridge overrides across updateField', () => {
    const { adapter, objects } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'raw' })
    const widget = editor.placeWidget(
      {
        fieldId: field.id,
        pageIndex: 0,
        docIndex: 0,
        x: 1,
        y: 1,
        width: 10,
        height: 10,
      },
      { bridgeOptions: { type: 'custom-box', label: 'Fixed' } }
    )

    expect(objects[0]).toMatchObject({
      id: widget.elementId,
      type: 'custom-box',
      label: 'Fixed',
    })

    editor.updateField(field.id, { name: 'renamed', type: 'dropdown' })
    expect(adapter.updateObject).not.toHaveBeenCalledWith(
      0,
      widget.elementId,
      expect.objectContaining({ type: 'dropdown' })
    )
    expect(adapter.updateObject).not.toHaveBeenCalledWith(
      0,
      widget.elementId,
      expect.objectContaining({ label: 'renamed' })
    )
  })

  it('scopes overlay sync and lookup by document when element ids repeat', () => {
    const editor = createFormEditor()
    const field = editor.createField({ type: 'text', name: 'shared' })
    const first = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
      elementId: 'same',
    })
    const second = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 1,
      x: 2,
      y: 2,
      width: 10,
      height: 10,
      elementId: 'same',
    })

    const synced = editor.syncFromOverlay(
      { id: 'same', x: 9, y: 9, width: 10, height: 10 },
      { pageIndex: 0, docIndex: 1 }
    )
    expect(synced?.id).toBe(second.id)
    expect(editor.getWidget(first.id)).toMatchObject({ x: 1, y: 1, docIndex: 0 })
    expect(editor.getWidget(second.id)).toMatchObject({ x: 9, y: 9, docIndex: 1 })
    expect(editor.getWidgetByElementId('same', 0)?.id).toBe(first.id)
    expect(editor.getWidgetByElementId('same', 1)?.id).toBe(second.id)
  })

  it('rejects linking the same elementId to two widgets in one document', () => {
    const { adapter } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'a' })
    editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
      elementId: 'shared-el',
    })

    expect(() => editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 2,
      y: 2,
      width: 10,
      height: 10,
      elementId: 'shared-el',
    })).toThrow(/already linked/)
  })

  it('rejects elementId changes while overlay sync is enabled', () => {
    const { adapter } = createOverlayAdapter()
    const editor = createFormEditor({ overlay: adapter })
    const field = editor.createField({ type: 'text', name: 'a' })
    const widget = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
    })

    expect(() => editor.updateWidget(widget.id, { elementId: 'other' }))
      .toThrow(/elementId while syncing overlay/)
    editor.updateWidget(widget.id, { elementId: 'other' }, { syncOverlay: false })
    expect(editor.getWidget(widget.id)?.elementId).toBe('other')
  })

  it('rejects duplicate elementId when changing docIndex or loading a model', () => {
    const editor = createFormEditor()
    const field = editor.createField({ type: 'text', name: 'a' })
    const first = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 0,
      x: 1,
      y: 1,
      width: 10,
      height: 10,
      elementId: 'shared-el',
    })
    const second = editor.placeWidget({
      fieldId: field.id,
      pageIndex: 0,
      docIndex: 1,
      x: 2,
      y: 2,
      width: 10,
      height: 10,
      elementId: 'shared-el',
    })

    expect(() => editor.updateWidget(
      second.id,
      { docIndex: 0 },
      { syncOverlay: false }
    )).toThrow(/already linked/)

    expect(() => editor.loadModel({
      fields: [{
        id: 'f1',
        type: 'text',
        name: 'n',
        widgetIds: ['w1', 'w2'],
      }],
      widgets: [
        {
          id: 'w1',
          fieldId: 'f1',
          pageIndex: 0,
          docIndex: 0,
          x: 1,
          y: 1,
          width: 10,
          height: 10,
          elementId: 'dup',
        },
        {
          id: 'w2',
          fieldId: 'f1',
          pageIndex: 1,
          docIndex: 0,
          x: 2,
          y: 2,
          width: 10,
          height: 10,
          elementId: 'dup',
        },
      ],
    })).toThrow(/Duplicate elementId/)

    expect(editor.getWidget(first.id)?.docIndex).toBe(0)
    expect(editor.getWidget(second.id)?.docIndex).toBe(1)
  })
})
