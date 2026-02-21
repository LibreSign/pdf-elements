<template>
  <button class="delete-btn" type="button" title="Delete" @click.stop="$emit('delete')">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1h.5v10.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V3.5h.5a.5.5 0 0 0 0-1H11Zm1 1v10.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V3.5h8Z"/>
    </svg>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DeleteButton',
})
</script>

<style scoped>
.delete-btn {
  border: none;
  background: transparent;
  color: #ffffff;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease;
}
.delete-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
