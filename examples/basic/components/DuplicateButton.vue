<template>
  <button class="duplicate-btn" type="button" title="Duplicate" @click.stop="$emit('duplicate')">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/>
    </svg>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DuplicateButton',
})
</script>

<style scoped>
.duplicate-btn {
  border: none;
  background: transparent;
  color: currentColor;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease;
}
.duplicate-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
