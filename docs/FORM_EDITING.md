<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Form field editing

Generic editing behavior for the [field/widget model](./FORM_MODEL.md). The editor is a plain TypeScript session: it owns a `PDFFormModel`, tracks logical selection, and optionally syncs visuals through the existing overlay API. It does not read Vue component internals.

Concrete per-type controls (text input UX, checkbox toggling, radio exclusive selection UI, dropdown pickers) are out of scope here. Hosts reuse this foundation when adding those types.

## Concepts

| Concern | Owner |
|---------|--------|
| Shared field data (`value`, `required`, `options`, …) | `PDFFormField` via `createField` / `updateField` |
| Placement and widget-only data (`exportValue`, geometry) | `PDFFormWidget` via `placeWidget` / `updateWidget` |
| Visual rectangles | Optional `FormEditorOverlayAdapter` → `PDFElements` methods |
| Logical selection | `selectField` / `selectWidget` on the editor session |

One field may have many widgets. Selecting a widget also selects its field. Non-form overlays continue to use `PDFElementObject` alone.

## Quick start

```ts
import {
  createFormEditor,
  createFormEditorOverlayAdapter,
  type PDFElementsPublicApi,
} from '@libresign/pdf-elements'

const overlay = pdfRef.value as PDFElementsPublicApi
const editor = createFormEditor({
  // Prefer the helper: it recovers rewritten ids after addObjectToPage collisions.
  overlay: createFormEditorOverlayAdapter(overlay),
})

const field = editor.createField({
  type: 'radio',
  name: 'color',
  options: [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
  ],
  required: true,
})

editor.placeWidget({
  fieldId: field.id,
  pageIndex: 0,
  x: 40,
  y: 80,
  width: 18,
  height: 18,
  exportValue: 'red',
})

editor.placeWidget({
  fieldId: field.id,
  pageIndex: 1,
  x: 40,
  y: 120,
  width: 18,
  height: 18,
  exportValue: 'blue',
})

editor.selectWidget(editor.getWidgetsForField(field.id)[0].id)
editor.updateField(field.id, { value: 'red' })
```

## Interactive placement

1. `editor.beginPlaceWidget({ fieldId, width, height, exportValue })` starts overlay placement when an adapter with `startAddingElement` is configured.
2. Listen for `pdf-elements:adding-ended`.
3. On `{ reason: 'placed', object, pageIndex, docIndex }`, call `editor.completeWidgetPlacement({ object, pageIndex, docIndex })`.
4. On cancel, call `editor.cancelPlaceWidget()` (also used if the host cancels placement).

`completeWidgetPlacement` only updates the form model and links `widget.elementId` to the placed overlay id. It does not add a second overlay rectangle.

`loadModel` and a second `beginPlaceWidget` cancel any in-progress overlay adding session before replacing editor state.

## Move / resize

Supported foundation path: programmatic `updateWidget` (optionally synced to the overlay) and host-driven `syncFromOverlay` when the host already knows the new geometry.

`PDFElements` drag/resize currently updates overlays internally without a dedicated public geometry event. Until such an event exists, hosts that need canvas drag to update the form model must observe their own integration points and call:

```ts
editor.syncFromOverlay(object, { pageIndex, docIndex })
```

Matching uses `widget.elementId`. `widget.id` is used only when `elementId` is absent.

When deleting from the overlay UI, listen for `pdf-elements:delete-object` and call `editor.removeWidget(...)` (or `removeField`) so the model stays aligned. Skip that removal while `overlay.isInternalMutation?.()` is true: spill rollback may restore page membership without a user delete. Prefer `createFormEditorOverlayAdapter`, which uses `moveObjectToPage` (no delete event) for that restore.

### Page / document changes

With overlay sync enabled, `updateWidget` **rejects** `pageIndex` / `docIndex` / `elementId` changes. Relocate by removing and re-placing the widget, or pass `{ syncOverlay: false }` and update visuals yourself.

Programmatic geometry updates that would make `PDFElements` move the rectangle to another page are treated as failure by `createFormEditorOverlayAdapter`: the helper restores the object on the original page via `moveObjectToPage` (without emitting `pdf-elements:delete-object`), then returns `false` so the editor rolls the widget back.

`loadModel` and editor construction reject models that reuse the same `elementId` inside one document. Changing `docIndex` with `{ syncOverlay: false }` also re-checks that invariant.

## Model access

| Method | Meaning |
|--------|---------|
| `getModel()` | Live session store. Mutating it bypasses overlay sync and editor invariants. |
| `getSnapshot()` | Deep JSON clone for persistence / transport. |
| `loadModel(...)` | Replaces the session via `parseFormModel` (relationship checks included) and cancels placement. |

`createField` does not accept pre-filled `widgetIds`. Attach visuals with `placeWidget`.

## Overlay adapter notes

- Prefer `createFormEditorOverlayAdapter(pdf)` so rewritten ids after collisions are recovered.
- That helper also re-reads overlay geometry after `updateObject`. If `PDFElements` drops or relocates the write, the helper restores the previous geometry when possible and returns `false`, so the editor can roll the widget back.
- If you hand-roll an adapter, return the **stored** object from `addObjectToPage` whenever ids may change. Returning bare `true` is only safe when the submitted id was kept.
- Optional `hasObject(docIndex, objectId, pageIndex?)` lets the editor link to an existing rectangle without inserting a duplicate.
- An `elementId` may be linked to only one widget. `syncFromOverlay` / `getWidgetByElementId` accept `docIndex` when the same id appears in more than one document.
- Optional `updateObject` may return `false` to reject geometry; the editor then rolls the widget back.
- If `updateObject` / `deleteObject` are omitted, model edits still succeed and overlay cleanup is skipped (orphan overlays possible).

Session `bridgeOptions` and per-`placeWidget` / `beginPlaceWidget` `bridgeOptions` (`type` / `label`) are remembered for appearance sync after `updateField`.

## Public surface

```ts
import {
  createFormEditor,
  createFormEditorOverlayAdapter,
} from '@libresign/pdf-elements'
import type {
  FormEditorOverlayAdapter,
  FormEditorSelection,
  FormFieldUpdate,
  FormWidgetUpdate,
  PDFFormEditor,
} from '@libresign/pdf-elements'
```

| Method | Role |
|--------|------|
| `createField` / `updateField` / `removeField` | Field lifecycle and shared properties |
| `placeWidget` / `updateWidget` / `removeWidget` | Widget lifecycle and placement |
| `beginPlaceWidget` / `completeWidgetPlacement` / `cancelPlaceWidget` | Interactive placement |
| `selectField` / `selectWidget` / `getSelection` | Logical selection |
| `syncFromOverlay` | Copy overlay geometry onto the linked widget |
| `getModel` / `getSnapshot` / `loadModel` | Live store vs persistence |

## Compatibility

- Generic signature/annotation overlays keep using `PDFElements` as before.
- Form editing is additive: omit the overlay adapter for model-only editing.
- Do not store LibreSign/Nextcloud workflow concepts on fields or widgets; use `metadata` or host state outside this package.
