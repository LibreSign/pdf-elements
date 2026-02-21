# Basic Example - @libresign/pdf-elements

This example shows how to integrate `PDFElements` with custom slots and basic actions.

## Structure

```
examples/basic/
├── App.vue
├── components/
│   ├── AppToolbar.vue
│   ├── DocumentsList.vue
│   ├── SignatureBox.vue
│   └── DeleteButton.vue
└── README.md
```

## Quick start

Import the component:

```vue
import PDFElements from '@libresign/pdf-elements'
```

Basic template:

```vue
<PDFElements
  ref="pdf"
  :init-files="initFiles"
  :init-file-names="fileNames"
  :initial-scale="1.1"
  @pdf-elements:end-init="onReady"
>
  <template #custom="{ object }">
    <SignatureBox :object="object" />
  </template>

  <template #actions="{ onDelete }">
    <button @click="onDelete">Delete</button>
  </template>
</PDFElements>
```

## Props and event

- `init-files`: PDF URLs or files.
- `init-file-names`: names shown in the footer.
- `initial-scale`: initial zoom.
- `pdf-elements:end-init`: emitted when the PDF finishes loading.

## Methods via `ref`

```js
const pdf = this.$refs.pdf

pdf.startAddingElement({
  width: 160,
  height: 48,
  label: 'Signature',
  icon: 'signature',
})

const objects = pdf.getAllObjects()
```

## Slots

For specific types, use `element-{type}`. Example for signature:

```vue
<template #element-signature="{ object }">
  <SignatureBox :object="object" />
</template>
```

If there is no specific slot, `#custom` is used as a fallback.

## Notes

Components under `components/` are just for the example and can be replaced freely.
