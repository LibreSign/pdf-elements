// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { App } from 'vue'
import PDFElements from './components/PDFElements.vue'

export { ensureWorkerReady, setWorkerPath } from './utils/asyncReader'
export {
  addWidgetToField,
  createFormField,
  createFormFieldId,
  createFormModel,
  createFormWidget,
  createFormWidgetId,
  elementObjectToFormWidgetPlacement,
  formWidgetToElementObject,
  getFieldForWidget,
  getFormFieldById,
  getFormWidgetById,
  getWidgetsForField,
  parseFormModel,
  serializeFormModel,
  validateFormModelRelationships,
} from './utils/formModel'
export {
  createFormEditor,
  createFormEditorOverlayAdapter,
} from './utils/formEditing'
export type {
  CreateFormFieldInput,
  CreateFormWidgetInput,
  FormModelRelationshipIssue,
  FormWidgetToElementOptions,
} from './utils/formModel'
export type {
  BeginPlaceWidgetInput,
  CompleteWidgetPlacementInput,
  CreateFormEditorOptions,
  FormEditorAddObjectResult,
  FormEditorOverlayAdapter,
  FormEditorSelection,
  FormFieldUpdate,
  FormWidgetUpdate,
  PDFFormEditor,
  PlaceFormWidgetOptions,
} from './utils/formEditing'
export type {
  PDFDocumentEntry,
  PDFElementObject,
  PDFElementsAddingEndedCancelledPayload,
  PDFElementsAddingEndedPayload,
  PDFElementsAddingEndedPlacedPayload,
  PDFElementsAddingEndedReason,
  PDFElementsPublicApi,
  PDFFormField,
  PDFFormFieldId,
  PDFFormFieldKnownType,
  PDFFormFieldOption,
  PDFFormFieldType,
  PDFFormFieldValue,
  PDFFormModel,
  PDFFormWidget,
  PDFFormWidgetId,
} from './types'

const install = (app: App) => {
  const name = PDFElements.name || 'PDFElements'
  app.component(name, PDFElements)
}

;(PDFElements as { install?: (app: App) => void }).install = install

export default PDFElements
export { PDFElements }
