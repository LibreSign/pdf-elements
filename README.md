<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# PDF Elements

A Vue 3 component for rendering PDFs with draggable and resizable element overlays.

**[Demo](https://libresign.github.io/pdf-elements/)** · [Examples](examples/)

## Development

- `npm run dev` - Run the demo with Vite
- `npm run build` - Build the library (ESM + types)
- `npm run build:demo` - Build the demo to `dist-demo`

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

```ts
<PDFElements
	:pdfjs-options="{
		disableFontFace: true,
		disableRange: true,
		disableStream: true,
	}"
/>
```

### Events

- `pdf-elements:end-init` - Emitted when PDF is loaded

### Slots

- `element-{type}` - Custom element rendering (e.g., `element-signature`)
- `custom` - Fallback for elements without specific type
- `actions` - Custom action buttons
