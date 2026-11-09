// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
  PDFElementObject,
  PDFElementsPublicApi,
  PDFFormField,
  PDFFormFieldId,
  PDFFormFieldOption,
  PDFFormFieldType,
  PDFFormFieldValue,
  PDFFormModel,
  PDFFormWidget,
  PDFFormWidgetId,
} from '../types'
import {
  addWidgetToField,
  createFormField,
  createFormModel,
  createFormWidgetId,
  elementObjectToFormWidgetPlacement,
  formWidgetToElementObject,
  getFormFieldById,
  getFormWidgetById,
  getWidgetsForField,
  parseFormModel,
  serializeFormModel,
  type CreateFormFieldInput,
  type CreateFormWidgetInput,
  type FormWidgetToElementOptions,
} from './formModel'

/**
 * Result of placing an overlay rectangle.
 * Prefer returning the stored {@link PDFElementObject} so the editor can read the
 * final id when the host regenerates ids on collision.
 */
export type FormEditorAddObjectResult = boolean | PDFElementObject

/**
 * Optional bridge to the generic overlay editor ({@link PDFElementsPublicApi}).
 * Form editing keeps its own model; overlays stay optional visuals.
 */
export interface FormEditorOverlayAdapter {
  /**
   * Places an overlay object. Return the stored object (or at least `{ id }`)
   * whenever the host may rewrite ids. `false` means placement failed.
   * `true` is accepted only when the submitted id is known to have been kept.
   */
  addObjectToPage: (
    object: PDFElementObject,
    pageIndex?: number,
    docIndex?: number
  ) => FormEditorAddObjectResult
  /**
   * Optional existence check used to link a widget to an already-present overlay
   * without inserting a duplicate rectangle. When `pageIndex` is provided, the
   * object must exist on that page.
   */
  hasObject?: (docIndex: number, objectId: string, pageIndex?: number) => boolean
  /**
   * Returns `false` when the host rejected the update (for example out of bounds).
   * `void` / `undefined` means the host does not report success/failure.
   */
  updateObject?: (
    docIndex: number,
    objectId: string,
    payload: Partial<PDFElementObject>
  ) => boolean | void
  /**
   * Preferred spill/page restore path. Must not emit a user-facing delete event.
   * Falls back to delete+add only when absent (hosts must ignore deletes during
   * {@link FormEditorOverlayAdapter.isInternalMutation}).
   */
  moveObjectToPage?: (
    docIndex: number,
    objectId: string,
    pageIndex: number,
    payload?: Partial<PDFElementObject>
  ) => boolean
  deleteObject?: (docIndex: number, objectId: string) => void
  startAddingElement?: (templateObject: PDFElementObject) => void
  cancelAdding?: () => void
  /** True while the adapter restores overlay state after a rejected update. */
  isInternalMutation?: () => boolean
}

/** Logical selection: a field, optionally narrowed to one of its widgets. */
export interface FormEditorSelection {
  fieldId: PDFFormFieldId | null
  widgetId: PDFFormWidgetId | null
}

/** Shared field properties that may be edited. Placement stays on widgets. */
export interface FormFieldUpdate {
  type?: PDFFormFieldType
  name?: string
  value?: PDFFormFieldValue
  defaultValue?: PDFFormFieldValue
  required?: boolean
  readOnly?: boolean
  options?: PDFFormFieldOption[]
  metadata?: Record<string, unknown>
}

/** Widget-specific properties. Owning field id is fixed after creation. */
export interface FormWidgetUpdate {
  pageIndex?: number
  docIndex?: number
  x?: number
  y?: number
  width?: number
  height?: number
  exportValue?: string
  elementId?: string
  metadata?: Record<string, unknown>
}

export interface CreateFormEditorOptions {
  model?: PDFFormModel
  overlay?: FormEditorOverlayAdapter
  /** Defaults applied when bridging widgets to overlay elements. */
  bridgeOptions?: FormWidgetToElementOptions
}

export interface PlaceFormWidgetOptions {
  /** When an overlay adapter is present, also place a visual rectangle. Default true. */
  syncOverlay?: boolean
  bridgeOptions?: FormWidgetToElementOptions
}

export interface BeginPlaceWidgetInput {
  fieldId: PDFFormFieldId
  width?: number
  height?: number
  exportValue?: string
  metadata?: Record<string, unknown>
  bridgeOptions?: FormWidgetToElementOptions
}

export interface CompleteWidgetPlacementInput {
  object: PDFElementObject
  pageIndex: number
  docIndex?: number
  exportValue?: string
  metadata?: Record<string, unknown>
}

interface PendingWidgetPlacement {
  fieldId: PDFFormFieldId
  width: number
  height: number
  exportValue?: string
  metadata?: Record<string, unknown>
  bridgeOptions?: FormWidgetToElementOptions
}

type OverlayObjectSnapshot = PDFElementObject & { pageIndex?: number }

function geometryMatches(
  object: Pick<PDFElementObject, 'x' | 'y' | 'width' | 'height'>,
  payload: Partial<PDFElementObject>
): boolean {
  if (payload.x !== undefined && object.x !== payload.x) return false
  if (payload.y !== undefined && object.y !== payload.y) return false
  if (payload.width !== undefined && object.width !== payload.width) return false
  if (payload.height !== undefined && object.height !== payload.height) return false
  return true
}

const OVERLAY_ENRICHMENT_KEYS = new Set([
  'pageIndex',
  'pageNumber',
  'scale',
  'normalizedCoordinates',
])

function toPlainOverlayElement(
  object: OverlayObjectSnapshot,
  geometry: Pick<PDFElementObject, 'x' | 'y' | 'width' | 'height'>
): PDFElementObject {
  const plain: PDFElementObject = {
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
  }
  for (const [key, value] of Object.entries(object)) {
    if (OVERLAY_ENRICHMENT_KEYS.has(key)) continue
    if (key === 'x' || key === 'y' || key === 'width' || key === 'height') continue
    plain[key] = value
  }
  return plain
}

function assertUniqueElementIds(model: PDFFormModel) {
  const seen = new Set<string>()
  for (const widget of model.widgets) {
    if (!widget.elementId) continue
    const key = `${resolveDocIndex(widget)}:${widget.elementId}`
    if (seen.has(key)) {
      throw new Error(
        `Duplicate elementId "${widget.elementId}" in document ${resolveDocIndex(widget)}`
      )
    }
    seen.add(key)
  }
}

const emptySelection = (): FormEditorSelection => ({
  fieldId: null,
  widgetId: null,
})

function cloneOptions(options?: PDFFormFieldOption[]): PDFFormFieldOption[] | undefined {
  if (options === undefined) return undefined
  return options.map((option) => ({ ...option }))
}

function cloneMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (metadata === undefined) return undefined
  return { ...metadata }
}

function requireField(model: PDFFormModel, fieldId: PDFFormFieldId): PDFFormField {
  const field = getFormFieldById(model, fieldId)
  if (!field) {
    throw new Error(`Form field "${fieldId}" was not found`)
  }
  return field
}

function requireWidget(model: PDFFormModel, widgetId: PDFFormWidgetId): PDFFormWidget {
  const widget = getFormWidgetById(model, widgetId)
  if (!widget) {
    throw new Error(`Form widget "${widgetId}" was not found`)
  }
  return widget
}

function defaultGeometry(width?: number, height?: number) {
  return {
    width: width ?? 120,
    height: height ?? 24,
  }
}

function resolveDocIndex(widget: PDFFormWidget, fallback = 0): number {
  return widget.docIndex ?? fallback
}

function resolvePlacedElementId(
  submitted: PDFElementObject,
  result: FormEditorAddObjectResult
): string {
  if (result === false) {
    throw new Error('Overlay placement failed')
  }
  if (result !== true) {
    if (!result.id) {
      throw new Error('Overlay adapter returned a placed object without an id')
    }
    return result.id
  }
  if (!submitted.id) {
    throw new Error(
      'Overlay adapter returned true without a stable id; return the stored object instead'
    )
  }
  return submitted.id
}

/**
 * Builds an overlay adapter that recovers the real object id after
 * {@link PDFElementsPublicApi.addObjectToPage} rewrites colliding ids.
 */
export function createFormEditorOverlayAdapter(
  api: PDFElementsPublicApi
): FormEditorOverlayAdapter {
  let internalMutationDepth = 0
  const runInternalMutation = <T>(work: () => T): T => {
    internalMutationDepth += 1
    try {
      return work()
    } finally {
      internalMutationDepth -= 1
    }
  }

  return {
    isInternalMutation: () => internalMutationDepth > 0,
    addObjectToPage(object, pageIndex, docIndex) {
      const before = new Set(
        api.getAllObjects(docIndex).map((entry) => entry.id).filter(Boolean) as string[]
      )
      const ok = api.addObjectToPage(object, pageIndex, docIndex)
      if (!ok) return false
      const after = api.getAllObjects(docIndex)
      const created = after.find((entry) => entry.id && !before.has(entry.id))
      if (created) return created
      const same = after.find((entry) => entry.id === object.id)
      return same ?? true
    },
    hasObject(docIndex, objectId, pageIndex) {
      return api.getAllObjects(docIndex).some((entry) => {
        const snapshot = entry as OverlayObjectSnapshot
        if (snapshot.id !== objectId) return false
        if (pageIndex === undefined) return true
        return snapshot.pageIndex === pageIndex
      })
    },
    moveObjectToPage: (docIndex, objectId, pageIndex, payload) => (
      api.moveObjectToPage(docIndex, objectId, pageIndex, payload)
    ),
    updateObject: (docIndex, objectId, payload) => {
      const before = api.getAllObjects(docIndex)
        .find((entry) => entry.id === objectId) as OverlayObjectSnapshot | undefined
      if (!before) return false

      const previous = {
        x: before.x,
        y: before.y,
        width: before.width,
        height: before.height,
      }
      const previousPageIndex = before.pageIndex

      api.updateObject(docIndex, objectId, payload)

      const after = api.getAllObjects(docIndex)
        .find((entry) => entry.id === objectId) as OverlayObjectSnapshot | undefined
      if (!after) return false

      const geometryRequested = payload.x !== undefined
        || payload.y !== undefined
        || payload.width !== undefined
        || payload.height !== undefined
      if (!geometryRequested) return true

      const pageMoved = previousPageIndex !== undefined
        && after.pageIndex !== undefined
        && after.pageIndex !== previousPageIndex
      if (pageMoved || !geometryMatches(after, payload)) {
        if (
          pageMoved
          && previousPageIndex !== undefined
          && after.pageIndex !== undefined
        ) {
          return runInternalMutation(() => {
            // Prefer silent page restore so hosts do not treat rollback as a user delete.
            if (
              typeof api.moveObjectToPage === 'function'
              && api.moveObjectToPage(docIndex, objectId, previousPageIndex, previous)
            ) {
              return false
            }
            // Fallback when moveObjectToPage is missing or returns false.
            // Hosts must honor isInternalMutation() if they sync delete-object → removeWidget.
            api.deleteObject(docIndex, objectId)
            const restored = toPlainOverlayElement(before, previous)
            restored.id = objectId
            api.addObjectToPage(restored, previousPageIndex, docIndex)
            return false
          })
        }
        api.updateObject(docIndex, objectId, previous)
        return false
      }
      return true
    },
    deleteObject: (docIndex, objectId) => {
      api.deleteObject(docIndex, objectId)
    },
    startAddingElement: (template) => {
      api.startAddingElement(template)
    },
    cancelAdding: () => {
      api.cancelAdding()
    },
  }
}

/**
 * Public form-editing facade. Holds a plain {@link PDFFormModel}, optional
 * overlay sync, and logical selection. Does not depend on Vue component state.
 */
export interface PDFFormEditor {
  getModel: () => PDFFormModel
  getSnapshot: () => PDFFormModel
  loadModel: (input: PDFFormModel | string) => PDFFormModel
  createField: (input: CreateFormFieldInput) => PDFFormField
  updateField: (fieldId: PDFFormFieldId, patch: FormFieldUpdate) => PDFFormField
  removeField: (fieldId: PDFFormFieldId, options?: PlaceFormWidgetOptions) => void
  placeWidget: (
    input: CreateFormWidgetInput,
    options?: PlaceFormWidgetOptions
  ) => PDFFormWidget
  beginPlaceWidget: (input: BeginPlaceWidgetInput) => void
  completeWidgetPlacement: (input: CompleteWidgetPlacementInput) => PDFFormWidget
  cancelPlaceWidget: () => void
  isPlacingWidget: () => boolean
  updateWidget: (
    widgetId: PDFFormWidgetId,
    patch: FormWidgetUpdate,
    options?: PlaceFormWidgetOptions
  ) => PDFFormWidget
  removeWidget: (widgetId: PDFFormWidgetId, options?: PlaceFormWidgetOptions) => void
  selectField: (fieldId: PDFFormFieldId | null) => FormEditorSelection
  selectWidget: (widgetId: PDFFormWidgetId | null) => FormEditorSelection
  getSelection: () => FormEditorSelection
  clearSelection: () => FormEditorSelection
  getField: (fieldId: PDFFormFieldId) => PDFFormField | undefined
  getWidget: (widgetId: PDFFormWidgetId) => PDFFormWidget | undefined
  getWidgetsForField: (fieldId: PDFFormFieldId) => PDFFormWidget[]
  getWidgetByElementId: (
    elementId: string,
    docIndex?: number
  ) => PDFFormWidget | undefined
  syncFromOverlay: (
    element: PDFElementObject,
    location: { pageIndex: number; docIndex?: number }
  ) => PDFFormWidget | undefined
}

/**
 * Creates a form editor session on top of the field/widget model from #84.
 * Overlay editing remains available for non-form elements via the adapter.
 */
export function createFormEditor(
  options: CreateFormEditorOptions = {}
): PDFFormEditor {
  let model: PDFFormModel = options.model
    ? parseFormModel(options.model)
    : createFormModel()
  if (options.model) {
    assertUniqueElementIds(model)
  }
  let selection = emptySelection()
  let pendingPlacement: PendingWidgetPlacement | null = null
  const overlay = options.overlay
  const defaultBridge = options.bridgeOptions ?? {}
  const widgetBridgeOverrides = new Map<PDFFormWidgetId, FormWidgetToElementOptions>()

  const getSelection = (): FormEditorSelection => ({ ...selection })

  const clearSelection = (): FormEditorSelection => {
    selection = emptySelection()
    return getSelection()
  }

  const clearPendingPlacement = (cancelOverlay: boolean) => {
    if (!pendingPlacement) return
    pendingPlacement = null
    if (cancelOverlay) {
      overlay?.cancelAdding?.()
    }
  }

  const rememberWidgetBridge = (
    widgetId: PDFFormWidgetId,
    bridgeOptions?: FormWidgetToElementOptions
  ) => {
    if (!bridgeOptions) return
    widgetBridgeOverrides.set(widgetId, { ...bridgeOptions })
  }

  const assertElementIdAvailable = (
    elementId: string | undefined,
    widgetId: PDFFormWidgetId,
    docIndex = 0
  ) => {
    if (!elementId) return
    const owner = model.widgets.find((entry) => (
      entry.id !== widgetId
      && entry.elementId === elementId
      && resolveDocIndex(entry) === docIndex
    ))
    if (owner) {
      throw new Error(
        `elementId "${elementId}" is already linked to widget "${owner.id}"`
      )
    }
  }

  const findWidgetByElementId = (
    elementId: string,
    docIndex?: number
  ): PDFFormWidget | undefined => {
    const matches = model.widgets.filter((entry) => entry.elementId === elementId)
    if (docIndex === undefined) return matches[0]
    return matches.find((entry) => resolveDocIndex(entry) === docIndex)
  }

  const pruneSelection = () => {
    if (selection.fieldId && !getFormFieldById(model, selection.fieldId)) {
      selection = emptySelection()
      return
    }
    if (selection.widgetId) {
      const widget = getFormWidgetById(model, selection.widgetId)
      if (!widget || (selection.fieldId && widget.fieldId !== selection.fieldId)) {
        selection = {
          fieldId: selection.fieldId && getFormFieldById(model, selection.fieldId)
            ? selection.fieldId
            : null,
          widgetId: null,
        }
      }
    }
  }

  const deleteOverlayForWidget = (widget: PDFFormWidget) => {
    if (!overlay?.deleteObject || !widget.elementId) return
    overlay.deleteObject(resolveDocIndex(widget), widget.elementId)
  }

  const syncOverlayGeometry = (widget: PDFFormWidget): boolean => {
    if (!overlay?.updateObject || !widget.elementId) return true
    const result = overlay.updateObject(resolveDocIndex(widget), widget.elementId, {
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    })
    return result !== false
  }

  const syncOverlayFieldAppearance = (field: PDFFormField) => {
    if (!overlay?.updateObject) return

    for (const widget of getWidgetsForField(model, field.id)) {
      if (!widget.elementId) continue
      const overrides = {
        ...defaultBridge,
        ...widgetBridgeOverrides.get(widget.id),
      }
      const payload: Partial<PDFElementObject> = {}
      if (overrides.type === undefined) payload.type = field.type
      if (overrides.label === undefined) payload.label = field.name
      if (Object.keys(payload).length === 0) continue
      overlay.updateObject(resolveDocIndex(widget), widget.elementId, payload)
    }
  }

  const placeOverlayForWidget = (
    widget: PDFFormWidget,
    field: PDFFormField,
    bridgeOptions?: FormWidgetToElementOptions
  ) => {
    if (!overlay) {
      throw new Error('Cannot sync overlay: no overlay adapter was configured')
    }

    const docIndex = resolveDocIndex(widget)
    assertElementIdAvailable(widget.elementId, widget.id, docIndex)
    if (
      widget.elementId
      && overlay.hasObject?.(docIndex, widget.elementId, widget.pageIndex)
    ) {
      rememberWidgetBridge(widget.id, bridgeOptions)
      return
    }

    if (!widget.elementId) {
      widget.elementId = `form-el-${createFormWidgetId()}`
    }

    const element = formWidgetToElementObject(widget, field, {
      ...defaultBridge,
      ...bridgeOptions,
    })
    const result = overlay.addObjectToPage(element, widget.pageIndex, docIndex)
    if (result === false) {
      throw new Error(
        `Failed to place overlay element for widget "${widget.id}" on page ${widget.pageIndex}`
      )
    }
    widget.elementId = resolvePlacedElementId(element, result)
    rememberWidgetBridge(widget.id, bridgeOptions)
  }

  const createField = (input: CreateFormFieldInput): PDFFormField => {
    if (input.widgetIds && input.widgetIds.length > 0) {
      throw new Error('createField does not accept widgetIds; use placeWidget to attach widgets')
    }
    const field = createFormField({ ...input, widgetIds: [] })
    if (getFormFieldById(model, field.id)) {
      throw new Error(`Cannot create field: id "${field.id}" already exists`)
    }
    model.fields.push(field)
    return field
  }

  const updateField = (
    fieldId: PDFFormFieldId,
    patch: FormFieldUpdate
  ): PDFFormField => {
    const field = requireField(model, fieldId)

    if (patch.type !== undefined) field.type = patch.type
    if (patch.name !== undefined) field.name = patch.name
    if (patch.value !== undefined) field.value = patch.value
    if (patch.defaultValue !== undefined) field.defaultValue = patch.defaultValue
    if (patch.required !== undefined) field.required = patch.required
    if (patch.readOnly !== undefined) field.readOnly = patch.readOnly
    if (patch.options !== undefined) field.options = cloneOptions(patch.options)
    if (patch.metadata !== undefined) field.metadata = cloneMetadata(patch.metadata)

    if (patch.type !== undefined || patch.name !== undefined) {
      syncOverlayFieldAppearance(field)
    }

    return field
  }

  const removeWidget = (
    widgetId: PDFFormWidgetId,
    placeOptions: PlaceFormWidgetOptions = {}
  ) => {
    const widget = requireWidget(model, widgetId)
    const field = getFormFieldById(model, widget.fieldId)
    const syncOverlay = placeOptions.syncOverlay !== false

    if (syncOverlay) {
      deleteOverlayForWidget(widget)
    }

    model.widgets = model.widgets.filter((entry) => entry.id !== widgetId)
    if (field) {
      field.widgetIds = field.widgetIds.filter((id) => id !== widgetId)
    }
    widgetBridgeOverrides.delete(widgetId)

    if (selection.widgetId === widgetId) {
      selection = { fieldId: selection.fieldId, widgetId: null }
    }
    pruneSelection()
  }

  const removeField = (
    fieldId: PDFFormFieldId,
    placeOptions: PlaceFormWidgetOptions = {}
  ) => {
    requireField(model, fieldId)
    const widgets = getWidgetsForField(model, fieldId)
    for (const widget of [...widgets]) {
      removeWidget(widget.id, placeOptions)
    }
    model.fields = model.fields.filter((field) => field.id !== fieldId)
    if (selection.fieldId === fieldId) {
      selection = emptySelection()
    }
    if (pendingPlacement?.fieldId === fieldId) {
      clearPendingPlacement(true)
    }
  }

  const placeWidget = (
    input: CreateFormWidgetInput,
    placeOptions: PlaceFormWidgetOptions = {}
  ): PDFFormWidget => {
    const field = requireField(model, input.fieldId)
    assertElementIdAvailable(
      input.elementId,
      input.id ?? '',
      input.docIndex ?? 0
    )
    const widget = addWidgetToField(model, input)
    const syncOverlay = placeOptions.syncOverlay !== false && !!overlay

    if (syncOverlay) {
      try {
        placeOverlayForWidget(widget, field, placeOptions.bridgeOptions)
      } catch (error) {
        model.widgets = model.widgets.filter((entry) => entry.id !== widget.id)
        field.widgetIds = field.widgetIds.filter((id) => id !== widget.id)
        widgetBridgeOverrides.delete(widget.id)
        throw error
      }
    } else {
      rememberWidgetBridge(widget.id, placeOptions.bridgeOptions)
    }

    return widget
  }

  const beginPlaceWidget = (input: BeginPlaceWidgetInput) => {
    const field = requireField(model, input.fieldId)
    const geometry = defaultGeometry(input.width, input.height)
    clearPendingPlacement(true)
    pendingPlacement = {
      fieldId: field.id,
      width: geometry.width,
      height: geometry.height,
      exportValue: input.exportValue,
      metadata: cloneMetadata(input.metadata),
      bridgeOptions: input.bridgeOptions ? { ...input.bridgeOptions } : undefined,
    }

    if (!overlay?.startAddingElement) {
      return
    }

    const template = formWidgetToElementObject(
      {
        id: 'pending-form-widget',
        fieldId: field.id,
        pageIndex: 0,
        x: 0,
        y: 0,
        width: geometry.width,
        height: geometry.height,
        exportValue: input.exportValue,
        metadata: pendingPlacement.metadata,
      },
      field,
      { ...defaultBridge, ...input.bridgeOptions }
    )
    delete template.id
    overlay.startAddingElement(template)
  }

  const completeWidgetPlacement = (
    input: CompleteWidgetPlacementInput
  ): PDFFormWidget => {
    if (!pendingPlacement) {
      throw new Error('No widget placement is in progress')
    }

    const { fieldId, width, height, exportValue, metadata, bridgeOptions } = pendingPlacement
    requireField(model, fieldId)

    const object = input.object
    const widgetInput: CreateFormWidgetInput = {
      fieldId,
      pageIndex: input.pageIndex,
      x: object.x,
      y: object.y,
      width: object.width ?? width,
      height: object.height ?? height,
    }

    if (input.docIndex !== undefined) widgetInput.docIndex = input.docIndex
    const resolvedExport = input.exportValue ?? exportValue
    if (resolvedExport !== undefined) widgetInput.exportValue = resolvedExport
    const resolvedMetadata = input.metadata ?? metadata
    if (resolvedMetadata !== undefined) {
      widgetInput.metadata = cloneMetadata(resolvedMetadata)
    }
    if (object.id) widgetInput.elementId = object.id

    pendingPlacement = null
    // Overlay already contains the placed object; only update the form model.
    return placeWidget(widgetInput, {
      syncOverlay: false,
      bridgeOptions,
    })
  }

  const cancelPlaceWidget = () => {
    clearPendingPlacement(true)
  }

  const updateWidget = (
    widgetId: PDFFormWidgetId,
    patch: FormWidgetUpdate,
    placeOptions: PlaceFormWidgetOptions = {}
  ): PDFFormWidget => {
    const widget = requireWidget(model, widgetId)
    const syncOverlay = placeOptions.syncOverlay !== false && !!overlay

    if (syncOverlay) {
      const pageChanged = patch.pageIndex !== undefined && patch.pageIndex !== widget.pageIndex
      const docChanged = patch.docIndex !== undefined && patch.docIndex !== widget.docIndex
      const elementChanged = patch.elementId !== undefined && patch.elementId !== widget.elementId
      if (pageChanged || docChanged) {
        throw new Error(
          'Cannot change widget pageIndex/docIndex while syncing overlay; '
          + 'remove and re-place the widget, or call updateWidget with syncOverlay: false'
        )
      }
      if (elementChanged) {
        throw new Error(
          'Cannot change widget elementId while syncing overlay; '
          + 'call updateWidget with syncOverlay: false after updating visuals yourself'
        )
      }
    }

    const nextDocIndex = patch.docIndex ?? resolveDocIndex(widget)
    if (patch.elementId !== undefined) {
      assertElementIdAvailable(patch.elementId, widget.id, nextDocIndex)
    } else if (
      patch.docIndex !== undefined
      && patch.docIndex !== resolveDocIndex(widget)
      && widget.elementId
    ) {
      assertElementIdAvailable(widget.elementId, widget.id, patch.docIndex)
    }

    const previousGeometry = {
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    }
    const geometryPatch = patch.x !== undefined
      || patch.y !== undefined
      || patch.width !== undefined
      || patch.height !== undefined

    if (patch.x !== undefined) widget.x = patch.x
    if (patch.y !== undefined) widget.y = patch.y
    if (patch.width !== undefined) widget.width = patch.width
    if (patch.height !== undefined) widget.height = patch.height

    if (syncOverlay && geometryPatch) {
      if (!syncOverlayGeometry(widget)) {
        widget.x = previousGeometry.x
        widget.y = previousGeometry.y
        widget.width = previousGeometry.width
        widget.height = previousGeometry.height
        throw new Error(
          `Overlay rejected geometry update for widget "${widget.id}"`
        )
      }
    }

    if (patch.pageIndex !== undefined) widget.pageIndex = patch.pageIndex
    if (patch.docIndex !== undefined) widget.docIndex = patch.docIndex
    if (patch.exportValue !== undefined) widget.exportValue = patch.exportValue
    if (patch.elementId !== undefined) widget.elementId = patch.elementId
    if (patch.metadata !== undefined) widget.metadata = cloneMetadata(patch.metadata)

    return widget
  }

  const selectField = (fieldId: PDFFormFieldId | null): FormEditorSelection => {
    if (fieldId === null) {
      return clearSelection()
    }
    requireField(model, fieldId)
    selection = { fieldId, widgetId: null }
    return getSelection()
  }

  const selectWidget = (widgetId: PDFFormWidgetId | null): FormEditorSelection => {
    if (widgetId === null) {
      selection = { fieldId: selection.fieldId, widgetId: null }
      return getSelection()
    }
    const widget = requireWidget(model, widgetId)
    selection = { fieldId: widget.fieldId, widgetId: widget.id }
    return getSelection()
  }

  const syncFromOverlay = (
    element: PDFElementObject,
    location: { pageIndex: number; docIndex?: number }
  ): PDFFormWidget | undefined => {
    if (!element.id) return undefined
    const byElementId = findWidgetByElementId(element.id, location.docIndex)
    const widget = byElementId
      ?? model.widgets.find((entry) => {
        if (entry.elementId || entry.id !== element.id) return false
        if (location.docIndex === undefined) return true
        return resolveDocIndex(entry) === location.docIndex
      })
    if (!widget) return undefined

    const placement = elementObjectToFormWidgetPlacement(element, location)
    widget.x = placement.x
    widget.y = placement.y
    widget.width = placement.width
    widget.height = placement.height
    widget.pageIndex = placement.pageIndex
    if (placement.docIndex !== undefined) {
      widget.docIndex = placement.docIndex
    }
    if (placement.elementId !== undefined) {
      widget.elementId = placement.elementId
    }

    return widget
  }

  return {
    getModel: () => model,
    getSnapshot: () => serializeFormModel(model),
    loadModel: (input) => {
      const next = parseFormModel(input)
      assertUniqueElementIds(next)
      clearPendingPlacement(true)
      model = next
      selection = emptySelection()
      widgetBridgeOverrides.clear()
      return model
    },
    createField,
    updateField,
    removeField,
    placeWidget,
    beginPlaceWidget,
    completeWidgetPlacement,
    cancelPlaceWidget,
    isPlacingWidget: () => pendingPlacement !== null,
    updateWidget,
    removeWidget,
    selectField,
    selectWidget,
    getSelection,
    clearSelection,
    getField: (fieldId) => getFormFieldById(model, fieldId),
    getWidget: (widgetId) => getFormWidgetById(model, widgetId),
    getWidgetsForField: (fieldId) => getWidgetsForField(model, fieldId),
    getWidgetByElementId: (elementId, docIndex) =>
      findWidgetByElementId(elementId, docIndex),
    syncFromOverlay,
  }
}
