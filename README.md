<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# PDF Elements

A Vue 2 component for rendering PDFs with draggable and resizable element overlays.

**[Demo](https://libresign.github.io/pdf-elements/)** · [Examples](examples/)

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
| `pageCountFormat` | String | `'{currentPage} of {totalPages}'` | Format string for page counter |
| `autoFitZoom` | Boolean | `false` | Automatically adjust zoom to fit viewport on window resize |

### Events

- `pdf-elements:end-init` - Emitted when PDF is loaded

### Methods

- `adjustZoomToFit()` - Manually trigger zoom adjustment to fit viewport (useful when calling programmatically)

### Slots

- `element-{type}` - Custom element rendering (e.g., `element-signature`)
- `custom` - Fallback for elements without specific type
- `actions` - Custom action buttons

### Usage Example

```vue
<template>
  <PDFElements
    ref="pdfElements"
    :init-files="pdfFiles"
    :init-file-names="['document.pdf']"
    :auto-fit-zoom="true"
    @pdf-elements:end-init="onPdfLoaded"
  >
    <template #element-signature="{ object, onDelete }">
      <CustomSignature :data="object" @delete="onDelete" />
    </template>
  </PDFElements>
</template>

<script>
export default {
  methods: {
    onPdfLoaded() {
      // PDF is loaded, auto-fit zoom is active
    },
  },
}
</script>
```
