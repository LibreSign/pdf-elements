<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Form field and widget model

This document describes the public form data model introduced for logical fields and visual widgets. The model is plain, serializable data and does not depend on Vue instances, DOM nodes or PDF.js runtime objects.

Generic overlay editing continues to use [`PDFElementObject`](./API.md). Form support is additive.

## Concepts

| Concept | Responsibility |
|---------|----------------|
| **Field** (`PDFFormField`) | Logical form control: type, name, value, default, required, read-only, options, metadata, and the list of widget ids. |
| **Widget** (`PDFFormWidget`) | One visual appearance of a field: page, optional document index, coordinates, size, optional export value, optional overlay `elementId`, metadata. |
| **Model** (`PDFFormModel`) | `{ fields, widgets }` document snapshot that can be persisted and restored. |

Relationships:

- One field → zero or more widgets.
- Each widget belongs to exactly one field (`widget.fieldId`).
- Widgets may live on different pages (and optionally different documents via `docIndex`).
- Radio groups are one field with several widgets; each widget may carry an `exportValue`.

Coordinates and page placement stay on the widget. Shared field properties are not duplicated as placement properties.

## Public types

```ts
import type {
  PDFFormField,
  PDFFormModel,
  PDFFormWidget,
} from '@libresign/pdf-elements'
```

### `PDFFormField`

| Property | Type | Notes |
|----------|------|--------|
| `id` | `string` | Stable field id |
| `type` | `PDFFormFieldType` | Known values: `text`, `checkbox`, `radio`, `dropdown`, `listbox`, `signature`, `button`. Any other string is allowed for unknown/future types. |
| `name` | `string` | Field name |
| `value` | `string \| number \| boolean \| string[] \| null` | Optional current value |
| `defaultValue` | same as `value` | Optional default |
| `required` | `boolean` | Optional |
| `readOnly` | `boolean` | Optional |
| `options` | `PDFFormFieldOption[]` | Choice fields |
| `widgetIds` | `string[]` | Ordered widget references |
| `metadata` | `Record<string, unknown>` | Extensible non-core data |

### `PDFFormWidget`

| Property | Type | Notes |
|----------|------|--------|
| `id` | `string` | Stable widget id |
| `fieldId` | `string` | Owning field |
| `pageIndex` | `number` | Zero-based page |
| `docIndex` | `number` | Optional document index |
| `x`, `y`, `width`, `height` | `number` | Placement |
| `exportValue` | `string` | Optional on-value for multi-widget fields |
| `elementId` | `string` | Optional link to a `PDFElementObject.id` |
| `metadata` | `Record<string, unknown>` | Extensible non-core data |

Host workflow concepts (recipients, envelopes, signing policies, participant roles, Nextcloud identities, and similar) must not be added to these core types. Put host-specific data in `metadata` or keep it outside this package.

## Helpers

```ts
import {
  addWidgetToField,
  createFormField,
  createFormModel,
  createFormWidget,
  elementObjectToFormWidgetPlacement,
  formWidgetToElementObject,
  getWidgetsForField,
  parseFormModel,
  serializeFormModel,
  validateFormModelRelationships,
} from '@libresign/pdf-elements'

const model = createFormModel()
const field = createFormField({
  type: 'radio',
  name: 'color',
  options: [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
  ],
  required: true,
})
model.fields.push(field)

addWidgetToField(model, {
  fieldId: field.id,
  pageIndex: 0,
  x: 40,
  y: 80,
  width: 18,
  height: 18,
  exportValue: 'red',
})

addWidgetToField(model, {
  fieldId: field.id,
  pageIndex: 1,
  x: 40,
  y: 120,
  width: 18,
  height: 18,
  exportValue: 'blue',
})

const widgets = getWidgetsForField(model, field.id)
const snapshot = serializeFormModel(model)
const restored = parseFormModel(JSON.stringify(snapshot))
```

`validateFormModelRelationships(model)` reports missing links, orphans, mismatches and duplicate ids without mutating the model.

## Serialization

- Prefer `serializeFormModel` / `parseFormModel` (or `JSON.stringify` / `JSON.parse` on a model that already passed validation).
- Values must remain JSON-serializable primitives (or string arrays / `null`).
- Do not store Vue component instances, DOM nodes, PDF.js `PDFDocumentProxy` objects, Promises or functions on fields, widgets or `metadata`.

## Compatibility with `PDFElementObject`

No breaking change is required for existing overlay consumers.

| Use case | API |
|----------|-----|
| Generic overlays (signatures, annotations, markers) | Keep using `PDFElementObject` and `PDFElements` methods (`startAddingElement`, `getAllObjects`, …). |
| Form-aware consumers | Keep a `PDFFormModel` beside the overlay store. Use `formWidgetToElementObject` to place/edit visuals, and `elementObjectToFormWidgetPlacement` to copy moved/resized geometry back onto widgets. |
| Bridge | Set `widget.elementId` to the overlay object `id` when both representations exist. |

### Migration

Existing integrations that only use `PDFElementObject` need no migration.

If a host previously encoded form semantics only on overlay objects (for example custom keys on `[key: string]: unknown`), migrate gradually:

1. Create `PDFFormField` entries for shared properties (`type`, `name`, value, required, options).
2. Create one `PDFFormWidget` per visual rectangle, including `pageIndex` and geometry.
3. Optionally set `elementId` to the existing overlay object id so the editor can keep using `PDFElementObject` until form editing lands (#85).
4. Stop duplicating field-level properties onto each overlay object once the form model is the source of truth.

## Out of scope

This package model does **not** implement:

- PDF AcroForm parsing or writing
- PDF mutation or cryptographic signing
- Full per-type editor behavior (tracked separately)

Those belong outside this issue and, for editor behavior, in follow-up work that builds on this model.

Parsing validates required properties, finite geometry, non-negative integer page/document
indices, non-negative sizes and plain JSON data (including metadata). Runtime objects,
functions, cycles and non-finite numbers are rejected before conversion.
By default it also checks both directions of field/widget references and rejects
duplicate IDs or repeated widget references. `{ strict: false }` skips only
relationship checks; property and JSON validation still apply.
