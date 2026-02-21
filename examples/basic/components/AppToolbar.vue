<template>
  <header class="toolbar">
    <div class="actions">
      <button class="btn" :disabled="loading" @click="$emit('load-sample')">
        Load sample PDF
      </button>
      <label class="btn file-btn" :class="{ disabled: loading }">
        <input
          type="file"
          accept="application/pdf"
          multiple
          :disabled="loading"
          @change="$emit('files-change', $event)"
        />
        Add PDFs
      </label>
      <button class="btn" :disabled="!isReady || isAddingElement" @click="$emit('add-signature')">
        {{ isAddingElement ? 'Click to place' : 'Add Signature' }}
      </button>
      <button class="btn ghost" :disabled="!isReady" @click="$emit('show-objects')">
        List objects
      </button>
      <button class="btn ghost" :disabled="!isReady" @click="$emit('clear-all')">
        Clear all
      </button>
    </div>
    <p class="hint">
      Click "Add Signature" then move mouse over PDF pages to preview position.
      Click to place on a page or press ESC to cancel.
    </p>
  </header>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AppToolbar',
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    isReady: {
      type: Boolean,
      default: false,
    },
    isAddingElement: {
      type: Boolean,
      default: false,
    },
  },
})
</script>

<style scoped>
.toolbar {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.btn {
  border: 1px solid #111827;
  background: #111827;
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 120ms ease;
}
.btn:hover:not(:disabled) {
  background: #0b1220;
}
.btn:disabled,
.file-btn.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.ghost {
  background: transparent;
  color: #111827;
}
.ghost:hover:not(:disabled) {
  background: #f3f4f6;
}
.file-btn {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.hint {
  margin: 10px 0 0;
  color: #4b5563;
  font-size: 14px;
}
</style>
