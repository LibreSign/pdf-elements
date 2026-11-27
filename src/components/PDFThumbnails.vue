<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <nav class="pdf-thumbnails" aria-label="Page thumbnails">
    <template v-for="(doc, docIndex) in documents" :key="`${generation}-${docIndex}`">
      <button
        v-for="(page, pageIndex) in doc.pages"
        :key="`${docIndex}-${pageIndex}`"
        ref="items"
        type="button"
        class="pdf-thumbnail"
        :class="{ 'pdf-thumbnail--active': isActive(docIndex, pageIndex) }"
        :aria-current="isActive(docIndex, pageIndex) ? 'page' : undefined"
        :aria-label="`${doc.name} ${pageIndex + 1}`"
        :data-doc-index="docIndex"
        :data-page-index="pageIndex"
        :style="{ width: `${width}px`, minHeight: `${getPlaceholderHeight(doc, pageIndex)}px` }"
        @click="$emit('select', { docIndex, pageIndex })"
      >
        <PDFPage
          v-if="isVisible(docIndex, pageIndex)"
          :page="page"
          :scale="getScale(doc, pageIndex)"
        />
        <span class="pdf-thumbnail__number">{{ pageIndex + 1 }}</span>
      </button>
    </template>
  </nav>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import PDFPage from './PDFPage.vue'
import type { PDFDocumentEntry, PDFElementsPageChangePayload } from '../types'

export default defineComponent({
  name: 'PDFThumbnails',
  components: { PDFPage },
  emits: ['select'],
  props: {
    documents: {
      type: Array as PropType<PDFDocumentEntry[]>,
      default: () => [],
    },
    currentPage: {
      type: Object as PropType<PDFElementsPageChangePayload | null>,
      default: null,
    },
    width: {
      type: Number,
      default: 120,
    },
  },
  data() {
    return {
      visibleKeys: {} as Record<string, boolean>,
      generation: 0,
      observer: null as IntersectionObserver | null,
    }
  },
  watch: {
    documents() {
      // A new document set must not reuse thumbnails (or visibility flags) of the previous one.
      this.visibleKeys = {}
      this.generation++
    },
    currentPage() {
      this.$nextTick(() => this.scrollActiveIntoView())
    },
  },
  mounted() {
    if (typeof IntersectionObserver === 'undefined') return
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        this.visibleKeys[`${el.dataset.docIndex}-${el.dataset.pageIndex}`] = true
        this.observer?.unobserve(el)
      }
    }, { root: null, rootMargin: '200px' })
    this.observeItems()
  },
  updated() {
    this.observeItems()
  },
  beforeUnmount() {
    this.observer?.disconnect()
    this.observer = null
  },
  methods: {
    observeItems() {
      if (!this.observer) return
      const items = (this.$refs.items || []) as HTMLElement[]
      for (const el of items) {
        if (!this.visibleKeys[`${el.dataset.docIndex}-${el.dataset.pageIndex}`]) {
          this.observer.observe(el)
        }
      }
    },
    scrollActiveIntoView() {
      const items = (this.$refs.items || []) as HTMLElement[]
      const active = items.find(el => el.classList?.contains('pdf-thumbnail--active'))
      active?.scrollIntoView?.({ block: 'nearest' })
    },
    isActive(docIndex: number, pageIndex: number) {
      return this.currentPage?.docIndex === docIndex && this.currentPage?.pageIndex === pageIndex
    },
    isVisible(docIndex: number, pageIndex: number) {
      // Without IntersectionObserver every thumbnail renders immediately.
      return !this.observer || !!this.visibleKeys[`${docIndex}-${pageIndex}`]
    },
    getScale(doc: PDFDocumentEntry, pageIndex: number) {
      const baseWidth = doc.pageWidths?.[pageIndex] || 0
      return baseWidth > 0 ? this.width / baseWidth : 0.2
    },
    getPlaceholderHeight(doc: PDFDocumentEntry, pageIndex: number) {
      const baseWidth = doc.pageWidths?.[pageIndex] || 0
      // Approximate A4 ratio until the real canvas is rendered.
      return baseWidth > 0 ? Math.round(this.width * 1.41) : 0
    },
  },
})
</script>

<style scoped>
.pdf-thumbnails {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  box-sizing: border-box;
}
.pdf-thumbnail {
  position: relative;
  display: block;
  padding: 0;
  border: 2px solid transparent;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.pdf-thumbnail--active {
  border-color: rgb(66 153 225);
}
.pdf-thumbnail__number {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 0 4px;
  font-size: 11px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}
</style>
