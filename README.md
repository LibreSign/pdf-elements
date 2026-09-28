<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# PDF Elements

[![npm version](https://img.shields.io/npm/v/@libresign/pdf-elements)](https://www.npmjs.com/package/@libresign/pdf-elements)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](COPYING)
[![Node CI](https://github.com/LibreSign/pdf-elements/actions/workflows/node.yml/badge.svg)](https://github.com/LibreSign/pdf-elements/actions/workflows/node.yml)
[![Tests](https://github.com/LibreSign/pdf-elements/actions/workflows/tests.yml/badge.svg)](https://github.com/LibreSign/pdf-elements/actions/workflows/tests.yml)

A Vue 3 PDF viewer for building interactive document workflows with draggable, resizable and fully customizable overlay elements.

Use it to build signature placement, form-field positioning, annotations, review tools, document preparation flows and other PDF experiences where users need to place or manipulate elements on top of a document.

**[Try the live demo](https://libresign.github.io/pdf-elements/)** · **[Install from npm](https://www.npmjs.com/package/@libresign/pdf-elements)** · [Examples](examples/) · [Contributing](CONTRIBUTING.md)

![The pdf-elements demo with a sample PDF loaded and a signature element placed on the first page](img/screenshot/demo.png)

## Why PDF Elements?

PDF rendering is only part of many document workflows. Applications often also need to let users place, move, resize, inspect or remove interactive elements over PDF pages.

PDF Elements provides that UI layer as a reusable Vue 3 component.

- **PDF.js-based rendering** for browser PDF viewing
- **Draggable and resizable overlays** positioned directly on PDF pages
- **Custom element types** rendered through Vue slots
- **Interactive placement mode** for adding elements to a document
- **Multiple PDF documents** in the same component
- **Read-only mode** for review and presentation flows
- **Custom action toolbars** for host-application controls
- **Themeable UI** using CSS variables
- **Typed public API** for TypeScript projects
- **ES module package** published as `@libresign/pdf-elements`

PDF Elements does **not** cryptographically sign or modify the PDF by itself. It focuses on the browser interaction layer, so you can connect it to your own signing, storage, form or document-processing backend.

## Install

```bash
npm install @libresign/pdf-elements
```

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import PDFElements from '@libresign/pdf-elements'

const pdf = ref()
const files = ref([
  'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
])

function addSignatureField() {
  pdf.value?.startAddingElement({
    type: 'signature',
    width: 160,
    height: 48,
    label: 'Signature',
  })
}
</script>

<template>
  <button @click="addSignatureField">
    Add signature field
  </button>

  <PDFElements
    ref="pdf"
    :init-files="files"
    :init-file-names="['sample.pdf']"
  >
    <template #element-signature="{ object }">
      <div>
        {{ object.label }}
      </div>
    </template>
  </PDFElements>
</template>
```

For a more complete integration with custom controls, actions and document handling, see the [basic example](examples/basic/).

## Use cases

PDF Elements is suitable for applications that need a visual PDF interaction layer, including:

- electronic-signature and document-preparation interfaces;
- placing signature, initials, date or text placeholders;
- PDF annotation and review tools;
- document form builders;
- approval and document workflow applications;
- custom business applications that need coordinates and sizing for PDF overlays.

## Development

Requirements are defined in `package.json`.

```bash
npm ci
npm run dev
```

Useful commands:

| Command | Purpose |
|---|---|
| `npm run dev` | Run the interactive demo with Vite |
| `npm run build` | Build the library |
| `npm run build:demo` | Build the hosted demo to `dist-demo` |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the Vue/TypeScript type checker |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | String | `'100%'` | Container width |
| `height` | String | `'100%'` | Container height |
| `initFiles` | Array | `[]` | PDF files to load |
| `initFileNames` | Array | `[]` | Names for the PDF files |
| `initialScale` | Number | `1` | Initial zoom scale |
| `showPageFooter` | Boolean | `true` | Show page footer with document name and page number |
| `hideSelectionUI` | Boolean | `false` | Hide selection handles and actions UI |
| `showSelectionHandles` | Boolean | `true` | Show resize/move handles on selected elements |
| `showElementActions` | Boolean | `true` | Show action buttons on selected elements |
| `readOnly` | Boolean | `false` | Disable drag, resize, and actions for elements |
| `ignoreClickOutsideSelectors` | Array | `[]` | CSS selectors that keep the selection active when clicking outside the element |
| `pageCountFormat` | String | `'{currentPage} of {totalPages}'` | Format string for page counter |
| `autoFitZoom` | Boolean | `false` | Automatically adjust zoom to fit viewport on window resize |
| `pdfjsOptions` | Object | `{}` | Options passed to PDF.js `getDocument` (advanced) |

### PDF.js options

`pdfjsOptions` is forwarded to PDF.js `getDocument(...)` and can be used to tune performance.

Example:

```vue
<PDFElements
  :pdfjs-options="{
    disableFontFace: true,
    disableRange: true,
    disableStream: true,
  }"
/>
```

### Events

- `pdf-elements:end-init` - Emitted when PDF is loaded.
- `pdf-elements:adding-ended` - Emitted when interactive placement ends. Payload: `{ reason: 'placed', object, docIndex, pageIndex }` on success or `{ reason: 'cancelled' }` when placement is cancelled.

### Exposed methods

- `startAddingElement(templateObject)` - Starts interactive placement mode.
- `cancelAdding()` - Cancels the current placement session and emits `pdf-elements:adding-ended` with `{ reason: 'cancelled' }` when a session was active.

### Slots

- `element-{type}` - Custom element rendering, for example `element-signature`.
- `custom` - Fallback for elements without a specific type slot.
- `actions` - Custom action buttons.

#### `actions` slot props

The `actions` slot receives:

- `object`
- `onDelete`
- `onDuplicate`
- `toolbarClass` (`pdf-elements-actions-toolbar`)
- `actionClass` (`pdf-elements-action-btn`)
- `actionAttrs` (`{ 'data-pdf-elements-action': 'true' }`)

These hooks allow host applications to style third-party button components consistently without depending on internal scoped selectors.

Example:

```vue
<template #actions="slotProps">
  <NcButton
    :class="slotProps.actionClass"
    v-bind="slotProps.actionAttrs"
    type="button"
    variant="tertiary"
    @click.stop="slotProps.onDuplicate"
  >
    Duplicate
  </NcButton>
</template>
```

### Theme variables

Action toolbar and action buttons can be themed via CSS variables and follow host theme tokens by default.

| Variable | Description |
|---|---|
| `--pdf-elements-toolbar-gap` | Toolbar button gap |
| `--pdf-elements-toolbar-padding` | Toolbar padding |
| `--pdf-elements-toolbar-background` | Toolbar background color |
| `--pdf-elements-toolbar-color` | Toolbar text/icon color |
| `--pdf-elements-toolbar-border-color` | Toolbar border color |
| `--pdf-elements-toolbar-border-radius` | Toolbar border radius |
| `--pdf-elements-toolbar-shadow` | Toolbar shadow |
| `--pdf-elements-action-btn-border` | Action button border |
| `--pdf-elements-action-btn-background` | Action button background |
| `--pdf-elements-action-btn-color` | Action button text/icon color |
| `--pdf-elements-action-btn-padding` | Action button padding |
| `--pdf-elements-action-btn-radius` | Action button border radius |
| `--pdf-elements-action-btn-min-height` | Action button min height |
| `--pdf-elements-action-btn-min-width` | Action button min width |
| `--pdf-elements-action-btn-shadow` | Action button shadow |
| `--pdf-elements-action-btn-hover-background` | Action button hover background |

## Community

Bug reports, feature ideas, documentation improvements, tests and code contributions are welcome.

- Found a bug? [Open a bug report](https://github.com/LibreSign/pdf-elements/issues/new/choose).
- Have an idea? [Start a feature request](https://github.com/LibreSign/pdf-elements/issues/new/choose).
- Want to contribute code? Read [CONTRIBUTING.md](CONTRIBUTING.md).
- Want to understand the project first? Try the [live demo](https://libresign.github.io/pdf-elements/) and inspect the [examples](examples/).

Small, focused pull requests are welcome, including documentation, accessibility, testing and developer-experience improvements.

## License

PDF Elements is free software licensed under the [GNU AGPL-3.0-or-later](COPYING).

The project is maintained by the LibreSign community and LibreCode.
