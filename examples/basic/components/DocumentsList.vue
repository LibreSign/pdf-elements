<template>
  <section v-if="documents.length" class="docs-list">
    <h3>Documents ({{ documents.length }})</h3>
    <ul>
      <li v-for="(doc, idx) in documents" :key="idx">
        {{ doc }}
        <button class="remove-doc" @click="$emit('remove', idx)" title="Remove">×</button>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DocumentsList',
  props: {
    documents: {
      type: Array,
      default: () => [],
    },
  },
})
</script>

<style scoped>
.docs-list {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 20px;
}
.docs-list h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.docs-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.docs-list li {
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 6px;
}
.remove-doc {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  line-height: 1;
}
.remove-doc:hover {
  color: #dc2626;
}
</style>
