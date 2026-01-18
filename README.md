<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# PDF Elements

A Vue 2 component for rendering PDFs with draggable and resizable element overlays.

**[Demo](https://libresign.github.io/pdf-elements/)** · [Examples](examples/)

## API

### Props

| Prop | Type | Default |
|------|------|---------|
| `width` | String | `'100%'` |
| `height` | String | `'100%'` |
| `initFiles` | Array | `[]` |
| `initFileNames` | Array | `[]` |
| `initialScale` | Number | `1` |
| `showPageFooter` | Boolean | `true` |
| `hideSelectionUI` | Boolean | `false` |
| `showSelectionHandles` | Boolean | `true` |
| `showElementActions` | Boolean | `true` |
| `pageCountFormat` | String | `'{currentPage} of {totalPages}'` |

### Events

- `pdf-elements:end-init` - Emitted when PDF is loaded

### Slots

- `element-{type}` - Custom element rendering (e.g., `element-signature`)
- `custom` - Fallback for elements without specific type
- `actions` - Custom action buttons
