// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
  PDFElementObject,
  PDFFormField,
  PDFFormFieldId,
  PDFFormFieldOption,
  PDFFormFieldType,
  PDFFormFieldValue,
  PDFFormModel,
  PDFFormWidget,
  PDFFormWidgetId,
} from '../types'

let fieldIdCounter = 0
let widgetIdCounter = 0

function createRandomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** Creates a stable-looking field id suitable for new logical fields. */
export function createFormFieldId(): PDFFormFieldId {
  fieldIdCounter += 1
  return `field-${Date.now()}-${fieldIdCounter}-${createRandomSuffix()}`
}

/** Creates a stable-looking widget id suitable for new visual widgets. */
export function createFormWidgetId(): PDFFormWidgetId {
  widgetIdCounter += 1
  return `widget-${Date.now()}-${widgetIdCounter}-${createRandomSuffix()}`
}

export interface CreateFormFieldInput {
  id?: PDFFormFieldId
  type: PDFFormFieldType
  name: string
  value?: PDFFormFieldValue
  defaultValue?: PDFFormFieldValue
  required?: boolean
  readOnly?: boolean
  options?: PDFFormFieldOption[]
  widgetIds?: PDFFormWidgetId[]
  metadata?: Record<string, unknown>
}

export interface CreateFormWidgetInput {
  id?: PDFFormWidgetId
  fieldId: PDFFormFieldId
  pageIndex: number
  docIndex?: number
  x: number
  y: number
  width: number
  height: number
  exportValue?: string
  elementId?: string
  metadata?: Record<string, unknown>
}

/** Builds a plain logical field object. Does not register widgets. */
export function createFormField(input: CreateFormFieldInput): PDFFormField {
  const field: PDFFormField = {
    id: input.id ?? createFormFieldId(),
    type: input.type,
    name: input.name,
    widgetIds: input.widgetIds ? [...input.widgetIds] : [],
  }

  if (input.value !== undefined) field.value = input.value
  if (input.defaultValue !== undefined) field.defaultValue = input.defaultValue
  if (input.required !== undefined) field.required = input.required
  if (input.readOnly !== undefined) field.readOnly = input.readOnly
  if (input.options !== undefined) {
    field.options = input.options.map((option) => ({ ...option }))
  }
  if (input.metadata !== undefined) {
    field.metadata = { ...input.metadata }
  }

  return field
}

/** Builds a plain visual widget object. Does not update the parent field. */
export function createFormWidget(input: CreateFormWidgetInput): PDFFormWidget {
  const widget: PDFFormWidget = {
    id: input.id ?? createFormWidgetId(),
    fieldId: input.fieldId,
    pageIndex: input.pageIndex,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  }

  if (input.docIndex !== undefined) widget.docIndex = input.docIndex
  if (input.exportValue !== undefined) widget.exportValue = input.exportValue
  if (input.elementId !== undefined) widget.elementId = input.elementId
  if (input.metadata !== undefined) {
    widget.metadata = { ...input.metadata }
  }

  return widget
}

/** Returns an empty serializable form model. */
export function createFormModel(): PDFFormModel {
  return {
    fields: [],
    widgets: [],
  }
}

export function getFormFieldById(
  model: PDFFormModel,
  fieldId: PDFFormFieldId
): PDFFormField | undefined {
  return model.fields.find((field) => field.id === fieldId)
}

export function getFormWidgetById(
  model: PDFFormModel,
  widgetId: PDFFormWidgetId
): PDFFormWidget | undefined {
  return model.widgets.find((widget) => widget.id === widgetId)
}

/** Returns widgets for a field in the order declared by `field.widgetIds`. */
export function getWidgetsForField(
  model: PDFFormModel,
  fieldId: PDFFormFieldId
): PDFFormWidget[] {
  const field = getFormFieldById(model, fieldId)
  if (!field) return []

  const byId = new Map(model.widgets.map((widget) => [widget.id, widget]))
  const ordered: PDFFormWidget[] = []

  for (const widgetId of field.widgetIds) {
    const widget = byId.get(widgetId)
    if (widget && widget.fieldId === fieldId) {
      ordered.push(widget)
    }
  }

  return ordered
}

export function getFieldForWidget(
  model: PDFFormModel,
  widgetId: PDFFormWidgetId
): PDFFormField | undefined {
  const widget = getFormWidgetById(model, widgetId)
  if (!widget) return undefined
  return getFormFieldById(model, widget.fieldId)
}

export interface FormModelRelationshipIssue {
  code:
    | 'unlisted-widget'
    | 'duplicate-widget-reference'
    | 'missing-widget'
    | 'widget-field-mismatch'
    | 'orphan-widget'
    | 'duplicate-field-id'
    | 'duplicate-widget-id'
  message: string
  fieldId?: PDFFormFieldId
  widgetId?: PDFFormWidgetId
}

/**
 * Validates field↔widget relationships without mutating the model.
 * Does not require PDF.js, Vue or DOM objects.
 */
export function validateFormModelRelationships(
  model: PDFFormModel
): FormModelRelationshipIssue[] {
  const issues: FormModelRelationshipIssue[] = []
  const fieldIds = new Set<PDFFormFieldId>()
  const widgetIds = new Set<PDFFormWidgetId>()

  for (const field of model.fields) {
    if (fieldIds.has(field.id)) {
      issues.push({
        code: 'duplicate-field-id',
        message: `Duplicate field id "${field.id}"`,
        fieldId: field.id,
      })
    }
    fieldIds.add(field.id)
  }

  for (const widget of model.widgets) {
    if (widgetIds.has(widget.id)) {
      issues.push({
        code: 'duplicate-widget-id',
        message: `Duplicate widget id "${widget.id}"`,
        widgetId: widget.id,
      })
    }
    widgetIds.add(widget.id)
    const owner = getFormFieldById(model, widget.fieldId)
    if (owner && !owner.widgetIds.includes(widget.id)) {
      issues.push({
        code: 'unlisted-widget',
        message: `Widget "${widget.id}" is not listed on field "${owner.id}"`,
        fieldId: owner.id,
        widgetId: widget.id,
      })
    }

    if (!fieldIds.has(widget.fieldId)) {
      issues.push({
        code: 'orphan-widget',
        message: `Widget "${widget.id}" references missing field "${widget.fieldId}"`,
        fieldId: widget.fieldId,
        widgetId: widget.id,
      })
    }
  }

  for (const field of model.fields) {
    const references = new Set<PDFFormWidgetId>()
    for (const widgetId of field.widgetIds) {
      if (references.has(widgetId)) {
        issues.push({
          code: 'duplicate-widget-reference',
          message: `Field "${field.id}" lists widget "${widgetId}" more than once`,
          fieldId: field.id,
          widgetId,
        })
      }
      references.add(widgetId)
      const widget = getFormWidgetById(model, widgetId)
      if (!widget) {
        issues.push({
          code: 'missing-widget',
          message: `Field "${field.id}" references missing widget "${widgetId}"`,
          fieldId: field.id,
          widgetId,
        })
        continue
      }
      if (widget.fieldId !== field.id) {
        issues.push({
          code: 'widget-field-mismatch',
          message: `Widget "${widgetId}" belongs to field "${widget.fieldId}" but is listed on "${field.id}"`,
          fieldId: field.id,
          widgetId,
        })
      }
    }
  }

  return issues
}

/**
 * Adds a widget to the model and appends its id to the owning field.
 * Throws when the field is missing or the widget id already exists.
 */
export function addWidgetToField(
  model: PDFFormModel,
  widgetInput: CreateFormWidgetInput
): PDFFormWidget {
  const field = getFormFieldById(model, widgetInput.fieldId)
  if (!field) {
    throw new Error(`Cannot add widget: field "${widgetInput.fieldId}" was not found`)
  }

  const widget = createFormWidget(widgetInput)
  if (getFormWidgetById(model, widget.id)) {
    throw new Error(`Cannot add widget: id "${widget.id}" already exists`)
  }

  model.widgets.push(widget)
  if (!field.widgetIds.includes(widget.id)) {
    field.widgetIds.push(widget.id)
  }

  return widget
}

/**
 * Deep-clones a form model into plain JSON-safe data.
 * Suitable for persistence and transport.
 */
export function serializeFormModel(model: PDFFormModel): PDFFormModel {
  return JSON.parse(JSON.stringify(model)) as PDFFormModel
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertJsonData(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (!Array.isArray(value) && !isPlainRecord(value)) {
    throw new Error('Form model must contain only plain JSON data')
  }
  if (ancestors.has(value)) throw new Error('Form model must not contain cycles')
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw new Error('Form model must not contain sparse arrays')
      }
    }
  }
  ancestors.add(value)
  for (const entry of Object.values(value)) assertJsonData(entry, ancestors)
  ancestors.delete(value)
}

function assertModelShape(raw: unknown): asserts raw is PDFFormModel {
  if (!isPlainRecord(raw)) throw new Error('Form model must be a plain object')
  if (!Array.isArray(raw.fields) || !Array.isArray(raw.widgets)) {
    throw new Error('Form model must include fields and widgets arrays')
  }
  const string = (value: unknown) => typeof value === 'string'
  const id = (value: unknown) => string(value) && value !== ''
  const value = (entry: unknown) =>
    entry === null || string(entry) || typeof entry === 'boolean'
    || (typeof entry === 'number' && Number.isFinite(entry))
    || (Array.isArray(entry) && entry.every(string))
  const optional = (record: Record<string, unknown>, key: string, check: (entry: unknown) => boolean) =>
    record[key] === undefined || check(record[key])
  for (const field of raw.fields) {
    if (!isPlainRecord(field)
      || !id(field.id) || !string(field.type) || !string(field.name)
      || !Array.isArray(field.widgetIds) || !field.widgetIds.every(id)
      || !optional(field, 'value', value) || !optional(field, 'defaultValue', value)
      || !optional(field, 'required', entry => typeof entry === 'boolean')
      || !optional(field, 'readOnly', entry => typeof entry === 'boolean')
      || !optional(field, 'metadata', isPlainRecord)
      || !optional(field, 'options', entry => Array.isArray(entry) && entry.every(option =>
        isPlainRecord(option) && string(option.value)
        && optional(option, 'label', string)
        && optional(option, 'disabled', disabled => typeof disabled === 'boolean')))) {
      throw new Error('Invalid form field properties')
    }
  }
  const index = (entry: unknown) => typeof entry === 'number' && Number.isInteger(entry) && entry >= 0
  for (const widget of raw.widgets) {
    if (!isPlainRecord(widget) || !id(widget.id) || !id(widget.fieldId)
      || !index(widget.pageIndex) || !optional(widget, 'docIndex', index)
      || !['x', 'y', 'width', 'height'].every(key =>
        typeof widget[key] === 'number' && Number.isFinite(widget[key]))
      || (widget.width as number) < 0 || (widget.height as number) < 0
      || !optional(widget, 'exportValue', string) || !optional(widget, 'elementId', id)
      || !optional(widget, 'metadata', isPlainRecord)) {
      throw new Error('Invalid form widget properties')
    }
  }
}

/**
 * Parses a JSON string or plain object into a {@link PDFFormModel}.
 * Rejects non-plain structures and reports relationship issues when `strict`.
 */
export function parseFormModel(
  input: string | unknown,
  options: { strict?: boolean } = {}
): PDFFormModel {
  const raw = typeof input === 'string' ? JSON.parse(input) : input
  assertModelShape(raw)
  assertJsonData(raw)
  const model = serializeFormModel(raw)

  if (options.strict !== false) {
    const issues = validateFormModelRelationships(model)
    if (issues.length > 0) {
      throw new Error(
        `Invalid form model relationships: ${issues.map((issue) => issue.message).join('; ')}`
      )
    }
  }

  return model
}

export interface FormWidgetToElementOptions {
  /** Defaults to the parent field type when provided. */
  type?: string
  label?: string
  resizable?: boolean
  /** Extra overlay properties merged onto the element. */
  extra?: Record<string, unknown>
}

/**
 * Bridges a form widget to a generic overlay {@link PDFElementObject}.
 * Coordinates come from the widget; shared field props stay on the field.
 */
export function formWidgetToElementObject(
  widget: PDFFormWidget,
  field?: Pick<PDFFormField, 'type' | 'name'>,
  options: FormWidgetToElementOptions = {}
): PDFElementObject {
  const element: PDFElementObject = {
    id: widget.elementId ?? widget.id,
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
  }

  const type = options.type ?? field?.type
  if (type !== undefined) element.type = type
  if (options.label !== undefined) {
    element.label = options.label
  } else if (field?.name !== undefined) {
    element.label = field.name
  }
  if (options.resizable !== undefined) element.resizable = options.resizable
  if (options.extra) {
    Object.assign(element, options.extra)
  }

  return element
}

/**
 * Creates a widget placement snapshot from an overlay element.
 * Does not invent field-level properties such as value or required.
 */
export function elementObjectToFormWidgetPlacement(
  element: PDFElementObject,
  location: { pageIndex: number; docIndex?: number }
): Pick<PDFFormWidget, 'x' | 'y' | 'width' | 'height' | 'pageIndex' | 'docIndex' | 'elementId'> {
  const placement: Pick<
    PDFFormWidget,
    'x' | 'y' | 'width' | 'height' | 'pageIndex' | 'docIndex' | 'elementId'
  > = {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    pageIndex: location.pageIndex,
  }

  if (location.docIndex !== undefined) placement.docIndex = location.docIndex
  if (element.id !== undefined) placement.elementId = element.id

  return placement
}
