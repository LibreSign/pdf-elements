<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Getting started

## Install

```bash
npm install @libresign/pdf-elements
```

## Basic usage

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
      <div>{{ object.label }}</div>
    </template>
  </PDFElements>
</template>
```

For a fuller integration with custom controls, actions and document handling, see the [basic example](../examples/basic/).

For the available props, events, methods, slots and theme variables, see the [API reference](API.md).
