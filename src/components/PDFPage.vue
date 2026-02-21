<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <canvas ref="canvas" />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'PDFPage',
  emits: ['onMeasure'],
  props: {
    page: {
      type: Object as PropType<Promise<unknown>>,
      required: true,
    },
    scale: {
      type: Number,
      default: 1,
    },
  },
  data() {
    return {
      dynamicScale: this.scale,
      isRendering: false,
      pendingRender: false,
      renderTask: null as { cancel: () => void; promise: Promise<void> } | null,
    }
  },
  watch: {
    scale(newScale) {
      this.dynamicScale = newScale
      this.render()
    },
  },
  mounted() {
    this.render()
  },
  beforeUnmount() {
    if (this.renderTask) {
      try {
        this.renderTask.cancel()
      } catch {
        // Ignore render cancellation errors.
      }
      this.renderTask = null
    }
  },
  methods: {
    getCanvasMeasurement() {
      return {
        canvasWidth: this.$refs.canvas.width,
        canvasHeight: this.$refs.canvas.height,
      }
    },
    measure() {
      this.$emit('onMeasure', {
        scale: this.dynamicScale,
      })
    },
    async render() {
      if (this.isRendering) {
        this.pendingRender = true
        return
      }
      this.isRendering = true
      this.pendingRender = false
      try {
        const _page = await this.page
        const canvas = this.$refs.canvas
        if (!canvas) return
        if (this.renderTask) {
          try {
            this.renderTask.cancel()
          } catch {
            // Ignore render cancellation errors.
          }
          this.renderTask = null
        }
        const context = canvas.getContext('2d')
        if (!context) return
        const viewport = _page.getViewport({
          scale: this.dynamicScale,
        })
        canvas.width = viewport.width
        canvas.height = viewport.height
        this.renderTask = _page.render({
          canvasContext: context,
          viewport,
        })
        await this.renderTask.promise
        this.measure()
      } finally {
        this.isRendering = false
        this.renderTask = null
        if (this.pendingRender) {
          this.pendingRender = false
          this.render()
        }
      }
    },
  },
})
</script>

<style scoped>
canvas {
  display: block;
}
</style>
