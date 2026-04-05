<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# PDF Elements

A Vue 3 component for rendering PDFs with draggable and resizable element overlays.

**[Demo](https://libresign.github.io/pdf-elements/)** · [Examples](examples/)

<img width="754" height="607" alt="image" src="https://github.com/user-attachments/assets/65009896-21ab-4ec5-9548-2707f8d16cdf" />

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
- `pdf-elements:adding-ended` - Emitted when interactive placement ends. Payload: `{ reason: 'placed', object, docIndex, pageIndex }` on success or `{ reason: 'cancelled' }` when the placement is cancelled.

### Exposed methods

- `startAddingElement(templateObject)` - Starts interactive placement mode.
- `cancelAdding()` - Cancels the current placement session and emits `pdf-elements:adding-ended` with `{ reason: 'cancelled' }` when a session was active.

### Slots

- `element-{type}` - Custom element rendering (e.g., `element-signature`)
- `custom` - Fallback for elements without specific type
- `actions` - Custom action buttons

#### `actions` slot props

The `actions` slot receives:

- `object`
- `onDelete`
- `onDuplicate`
- `toolbarClass` (`pdf-elements-actions-toolbar`)
- `actionClass` (`pdf-elements-action-btn`)
- `actionAttrs` (`{ 'data-pdf-elements-action': 'true' }`)

Use these hooks to style third-party button components consistently (for example, Nextcloud `NcButton`) without relying on internal scoped selectors.

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
