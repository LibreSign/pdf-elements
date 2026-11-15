// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import type { PDFFormModel } from '../../src/types'
import {
  addWidgetToField,
  createFormField,
  createFormModel,
  createFormWidget,
  elementObjectToFormWidgetPlacement,
  formWidgetToElementObject,
  getFieldForWidget,
  getWidgetsForField,
  parseFormModel,
  serializeFormModel,
  validateFormModelRelationships,
} from '../../src/utils/formModel'

describe('formModel relationships', () => {
  it('keeps logical fields separate from visual widgets', () => {
    const model = createFormModel()
    const field = createFormField({
      type: 'text',
      name: 'full-name',
      value: 'Ada',
      defaultValue: '',
      required: true,
      readOnly: false,
    })
    model.fields.push(field)

    const widget = addWidgetToField(model, {
      fieldId: field.id,
      pageIndex: 0,
      x: 10,
      y: 20,
      width: 120,
      height: 24,
    })

    expect(field).not.toHaveProperty('x')
    expect(field).not.toHaveProperty('pageIndex')
    expect(widget).not.toHaveProperty('value')
    expect(widget).not.toHaveProperty('required')
    expect(widget.fieldId).toBe(field.id)
    expect(field.widgetIds).toEqual([widget.id])
  })

  it('supports one field with multiple widgets on different pages', () => {
    const model = createFormModel()
    const field = createFormField({
      type: 'radio',
      name: 'choice',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    })
    model.fields.push(field)

    addWidgetToField(model, {
      fieldId: field.id,
      pageIndex: 0,
      x: 10,
      y: 10,
      width: 16,
      height: 16,
      exportValue: 'a',
    })
    addWidgetToField(model, {
      fieldId: field.id,
      pageIndex: 2,
      docIndex: 0,
      x: 40,
      y: 80,
      width: 16,
      height: 16,
      exportValue: 'b',
    })

    const widgets = getWidgetsForField(model, field.id)
    expect(widgets).toHaveLength(2)
    expect(widgets.map((widget) => widget.pageIndex)).toEqual([0, 2])
    expect(widgets.map((widget) => widget.exportValue)).toEqual(['a', 'b'])
    expect(getFieldForWidget(model, widgets[1].id)?.id).toBe(field.id)
    expect(validateFormModelRelationships(model)).toEqual([])
  })

  it('assigns stable ids to fields and widgets', () => {
    const field = createFormField({ type: 'checkbox', name: 'agree' })
    const widget = createFormWidget({
      fieldId: field.id,
      pageIndex: 0,
      x: 0,
      y: 0,
      width: 12,
      height: 12,
    })

    expect(field.id).toMatch(/^field-/)
    expect(widget.id).toMatch(/^widget-/)
    expect(field.id).not.toBe(widget.id)
  })

  it('represents unknown future field types without losing identity', () => {
    const field = createFormField({
      type: 'custom-barcode',
      name: 'parcel',
      metadata: { symbology: 'qr' },
    })

    expect(field.type).toBe('custom-barcode')
    expect(field.metadata).toEqual({ symbology: 'qr' })
  })

  it('reports broken field/widget relationships', () => {
    const broken: PDFFormModel = {
      fields: [
        createFormField({
          id: 'field-1',
          type: 'text',
          name: 'a',
          widgetIds: ['missing-widget'],
        }),
      ],
      widgets: [
        createFormWidget({
          id: 'orphan',
          fieldId: 'missing-field',
          pageIndex: 0,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        }),
      ],
    }

    const codes = validateFormModelRelationships(broken).map((issue) => issue.code)
    expect(codes).toContain('missing-widget')
    expect(codes).toContain('orphan-widget')
  })
})

describe('formModel serialization', () => {
  it('round-trips through JSON without runtime objects', () => {
    const model = createFormModel()
    const field = createFormField({
      type: 'dropdown',
      name: 'country',
      value: 'br',
      defaultValue: 'br',
      required: true,
      options: [{ value: 'br', label: 'Brazil' }],
      metadata: { source: 'import' },
    })
    model.fields.push(field)
    addWidgetToField(model, {
      fieldId: field.id,
      pageIndex: 1,
      x: 5,
      y: 6,
      width: 100,
      height: 28,
      elementId: 'obj-1',
    })

    const json = JSON.stringify(serializeFormModel(model))
    const restored = parseFormModel(json)

    expect(restored).toEqual(model)
    expect(validateFormModelRelationships(restored)).toEqual([])
    expect(json).not.toMatch(/\[object /)
  })

  it('rejects invalid payloads and strict relationship failures', () => {
    expect(() => parseFormModel(null)).toThrow(/plain object/)
    expect(() => parseFormModel({ fields: [] })).toThrow(/fields and widgets/)
    expect(() =>
      parseFormModel({
        fields: [{ id: 'f', type: 'text', name: 'n', widgetIds: ['w'] }],
        widgets: [],
      })
    ).toThrow(/Invalid form model relationships/)
  })

  it('bridges widgets and overlay elements without copying field values onto placement', () => {
    const field = createFormField({
      type: 'signature',
      name: 'Signer',
      value: null,
      required: true,
    })
    const widget = createFormWidget({
      fieldId: field.id,
      pageIndex: 0,
      x: 12,
      y: 34,
      width: 160,
      height: 48,
      elementId: 'obj-sig',
    })

    const element = formWidgetToElementObject(widget, field)
    expect(element).toEqual({
      id: 'obj-sig',
      type: 'signature',
      label: 'Signer',
      x: 12,
      y: 34,
      width: 160,
      height: 48,
    })
    expect(element).not.toHaveProperty('value')
    expect(element).not.toHaveProperty('required')

    const placement = elementObjectToFormWidgetPlacement(
      { ...element, x: 50, y: 60 },
      { pageIndex: 2, docIndex: 1 }
    )
    expect(placement).toEqual({
      x: 50,
      y: 60,
      width: 160,
      height: 48,
      pageIndex: 2,
      docIndex: 1,
      elementId: 'obj-sig',
    })
    expect(placement).not.toHaveProperty('value')
  })
})

describe('form model validation regressions', () => {
  const widget = {
    id: 'w', fieldId: 'f', pageIndex: 0,
    x: 0, y: 0, width: 10, height: 10,
  }
  const field = { id: 'f', type: 'text', name: 'name', widgetIds: ['w'] }

  it('rejects missing reverse links and repeated references', () => {
    for (const widgetIds of [[], ['w', 'w']]) {
      const model = { fields: [{ ...field, widgetIds }], widgets: [widget] }
      expect(validateFormModelRelationships(model)).not.toEqual([])
      expect(() => parseFormModel(model)).toThrow(/relationships/)
    }
  })

  it.each([
    { fields: [], widgets: [{}] },
    { fields: [{ ...field, required: 'yes' }], widgets: [widget] },
    { fields: [{ ...field, value: {} }], widgets: [widget] },
    { fields: [{ ...field, options: [{}] }], widgets: [widget] },
    { fields: [field], widgets: [{ ...widget, pageIndex: -1 }] },
    { fields: [field], widgets: [{ ...widget, x: Infinity }] },
    { fields: [field], widgets: [{ ...widget, width: -1 }] },
    { fields: [field], widgets: [{ ...widget, id: '' }] },
  ])('rejects malformed properties even with strict disabled: %j', input => {
    expect(() => parseFormModel(input)).toThrow()
    expect(() => parseFormModel(input, { strict: false })).toThrow()
  })

  it('rejects runtime metadata and cycles before JSON conversion', () => {
    for (const metadata of [{ date: new Date() }, { fn: () => {} }, { value: NaN }]) {
      expect(() => parseFormModel({
        fields: [{ ...field, metadata }], widgets: [widget],
      })).toThrow(/JSON/)
    }
    const metadata: Record<string, unknown> = {}
    metadata.self = metadata
    expect(() => parseFormModel({
      fields: [{ ...field, metadata }], widgets: [widget],
    })).toThrow(/cycles/)
  })

  it('allows strict false to skip only relationship checks', () => {
    expect(parseFormModel({
      fields: [{ ...field, widgetIds: [] }], widgets: [widget],
    }, { strict: false }).widgets).toEqual([widget])
  })
})

describe('sparse array parsing', () => {
  it.each(['value', 'defaultValue', 'options'])('rejects sparse %s arrays', key => {
    const input = {
      fields: [{ id: 'f', type: 'listbox', name: 'n', widgetIds: [], [key]: new Array(1) }],
      widgets: [],
    }
    expect(() => parseFormModel(input)).toThrow(/sparse/)
    expect(() => parseFormModel(input, { strict: false })).toThrow(/sparse/)
  })
})
