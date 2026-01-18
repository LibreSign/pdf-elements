# Basic Example - @libresign/pdf-elements

Basic integration example of the `PDFElements` component with dragging, resizing, and positioning elements in PDFs.

## Structure

```
examples/basic/
├── App.vue                    # Main component: PDFElements integration
├── components/
│   ├── AppToolbar.vue        # Toolbar component
│   ├── DocumentsList.vue     # List of loaded documents
│   ├── SignatureBox.vue      # Custom visual element
│   └── DeleteButton.vue      # Delete button
└── README.md
```

## How to Use PDFElements

### 1. Import the component

```vue
import PDFElements from '@libresign/pdf-elements'
```

### 2. Basic template

```vue
<PDFElements
  ref="pdf"
  :init-files="initFiles"
  :init-file-names="fileNames"
  :initial-scale="1.1"
  @pdf-elements:end-init="onReady"
>
  <template #custom="{ object, isSelected }">
    <!-- Your component here -->
  </template>

  <template #actions="{ onDelete }">
    <button @click="onDelete">Delete</button>
  </template>
</PDFElements>
```

### 3. Main props

- **`init-files`**: Array of PDF URLs or File objects
- **`init-file-names`**: Array with document names
- **`initial-scale`**: Initial rendering scale (default: 1)

### 4. Events

- **`pdf-elements:end-init`**: Triggered when PDFs finish loading

### 5. Ref methods

```javascript
const pdf = this.$refs.pdf

// Iniciar modo de adicionar elemento (com preview que segue o mouse)
pdf.startAddingElement({
  width: 160,
  height: 48,
  label: 'Signature',
  icon: 'signature',
})

// Obter todos os objetos do documento
const objects = pdf.getAllObjects()
```

### 6. Slots

#### Type-specific slots (recommended for multiple element types)
```vue
<!-- Slot for signature elements -->
<template #element-signature="{ object }">
  <SignatureBox :object="object" />
</template>

<!-- Slot for text elements -->
<template #element-text="{ object }">
  <TextBox :object="object" />
</template>

<!-- Slot for date elements -->
<template #element-date="{ object }">
  <DateBox :object="object" />
</template>
```

When an object has `type: 'signature'`, PDFElements looks for `#element-signature`. If not found, uses the `#custom` fallback.

#### `#custom` - Generic rendering (fallback)
Used when:
- The object doesn't have a `type` property
- No specific slot exists for the type

Receives:
- `object`: Element data (x, y, width, height, type, custom props)
- `isSelected`: Boolean indicating if selected

#### `#actions` - Action toolbar
Receives:
- `object`: Element data
- `onDelete`: Function to delete the element

### Multiple types example

```vue
<PDFElements ref="pdf" :init-files="files">
  <!-- Signature elements -->
  <template #element-signature="{ object }">
    <div class="signature-box">
      <SignIcon />
      {{ object.label }}
    </div>
  </template>

  <!-- Text input elements -->
  <template #element-text="{ object }">
    <div class="text-box">
      <input :value="object.value" />
    </div>
  </template>

  <!-- Date picker elements -->
  <template #element-date="{ object }">
    <div class="date-box">
      <CalendarIcon />
      {{ object.date || 'Select date' }}
    </div>
  </template>

  <!-- Checkbox elements -->
  <template #element-checkbox="{ object }">
    <div class="checkbox-box">
      <input type="checkbox" :checked="object.checked" />
    </div>
  </template>

  <!-- Fallback for unknown types -->
  <template #custom="{ object }">
    <div class="generic-box">
      {{ object.type || 'Element' }}
    </div>
  </template>

  <!-- Common actions for all types -->
  <template #actions="{ onDelete }">
    <button @click="onDelete">Delete</button>
  </template>
</PDFElements>
```

**Performance**: Slots dinâmicos são eficientes - Vue compila apenas os slots usados. Muito melhor que condicionais enormes.

## Funcionalidades Implementadas

✅ **Carregar múltiplos PDFs** (URL ou arquivo local)
✅ **Adicionar elementos com preview** (clique no botão → move o mouse → clique para posicionar)
✅ **Arrastar elementos** dentro da mesma página ou entre páginas diferentes
✅ **Redimensionar elementos** (4 cantos, mantém aspect-ratio)
✅ **Validação de bounds** (elementos não podem sair das páginas)
✅ **Elementos responsivos** (texto ajusta tamanho conforme dimensões)
✅ **Toolbar flutuante** com ações (aparece ao selecionar elemento)
✅ **Rolagem durante drag** (atualiza posições automaticamente)

## Componentes Auxiliares

Os componentes em `components/` são **apenas para o exemplo**. Você pode:
- Usar seus próprios componentes
- Estilizar da forma que preferir
- Adicionar mais ações no toolbar
- Customizar totalmente o visual dos elementos

O importante é entender como usar o `PDFElements` no `App.vue`.
