// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface PDFElementObject {
  id?: string
  x: number
  y: number
  width: number
  height: number
  type?: string
  label?: string
  icon?: string
  resizable?: boolean
  [key: string]: unknown
}

export type PDFElementsAddingEndedReason = 'placed' | 'cancelled'

export interface PDFElementsAddingEndedPlacedPayload {
  reason: 'placed'
  object: PDFElementObject
  docIndex: number
  pageIndex: number
}

export interface PDFElementsAddingEndedCancelledPayload {
  reason: 'cancelled'
}

export type PDFElementsAddingEndedPayload =
  | PDFElementsAddingEndedPlacedPayload
  | PDFElementsAddingEndedCancelledPayload

export interface PDFDocumentEntry {
  name: string
  file: unknown
  pdfDoc: unknown
  numPages: number
  pages: Promise<unknown>[]
  pageWidths: number[]
  pagesScale: number[]
  allObjects: PDFElementObject[][]
}

export interface PDFElementsPublicApi {
  startAddingElement: (templateObject: PDFElementObject) => void
  addObjectToPage: (object: PDFElementObject, pageIndex?: number, docIndex?: number) => boolean
  getAllObjects: (docIndex?: number) => PDFElementObject[]
  updateObject: (docIndex: number, objectId: string, payload: Partial<PDFElementObject>) => void
  deleteObject: (docIndex: number, objectId: string) => void
  duplicateObject: (docIndex: number, objectId: string) => void
  cancelAdding: () => void
}

/**
 * Stable identifier for a logical form field.
 * Fields hold shared properties; visual placement lives on widgets.
 */
export type PDFFormFieldId = string

/**
 * Stable identifier for a visual form widget.
 * A widget is one rectangle on one page belonging to a field.
 */
export type PDFFormWidgetId = string

/**
 * Well-known field types. Consumers may also use any other string for
 * unknown or future types without losing identity.
 */
export type PDFFormFieldKnownType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'listbox'
  | 'signature'
  | 'button'

/**
 * Field type string. Known values are listed in {@link PDFFormFieldKnownType};
 * arbitrary strings remain valid for forward compatibility.
 */
export type PDFFormFieldType = PDFFormFieldKnownType | (string & {})

/**
 * Plain serializable field value. Prefer primitives and string arrays so the
 * model can be persisted without Vue, DOM or PDF.js objects.
 */
export type PDFFormFieldValue = string | number | boolean | string[] | null

/**
 * Choice option for dropdown, listbox, radio and similar fields.
 */
export interface PDFFormFieldOption {
  value: string
  label?: string
  disabled?: boolean
}

/**
 * Logical form field. Shared properties live here; page coordinates do not.
 *
 * One field may reference many widgets (radio groups, repeated appearances,
 * the same field on different pages).
 */
export interface PDFFormField {
  id: PDFFormFieldId
  type: PDFFormFieldType
  name: string
  value?: PDFFormFieldValue
  defaultValue?: PDFFormFieldValue
  required?: boolean
  readOnly?: boolean
  options?: PDFFormFieldOption[]
  /** Ordered widget ids that belong to this field. */
  widgetIds: PDFFormWidgetId[]
  /** Extensible bag for non-core data. Keep host-specific workflow data here. */
  metadata?: Record<string, unknown>
}

/**
 * Visual widget for a form field. Placement and page belong here only.
 */
export interface PDFFormWidget {
  id: PDFFormWidgetId
  fieldId: PDFFormFieldId
  pageIndex: number
  /** Optional when the model is already scoped to a single document. */
  docIndex?: number
  x: number
  y: number
  width: number
  height: number
  /**
   * On-value for this appearance when a field has several widgets
   * (for example each radio button in a group).
   */
  exportValue?: string
  /**
   * Optional link to a {@link PDFElementObject} id used by the overlay editor.
   * Lets form widgets coexist with generic non-form overlays.
   */
  elementId?: string
  metadata?: Record<string, unknown>
}

/**
 * Plain serializable form document model: logical fields plus visual widgets.
 * Independent from Vue component state, DOM nodes and PDF.js runtime objects.
 */
export interface PDFFormModel {
  fields: PDFFormField[]
  widgets: PDFFormWidget[]
}
