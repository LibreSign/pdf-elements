<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <canvas ref="canvas" />
</template>

<script>
export default {
  name: 'PDFPage',
  props: {
    page: {
      type: Promise,
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
      boundMeasure: null,
    }
  },
  watch: {
    scale(newScale) {
      this.dynamicScale = newScale
      this.render()
    },
  },
  mounted() {
    this.boundMeasure = this.measure.bind(this)
    window.addEventListener('resize', this.boundMeasure)
    this.render()
  },
  beforeUnmount() {
    if (this.boundMeasure) {
      window.removeEventListener('resize', this.boundMeasure)
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
      if (this.isRendering) return
      this.isRendering = true
      try {
        const _page = await this.page
        const canvas = this.$refs.canvas
        const context = canvas.getContext('2d')
        const viewport = _page.getViewport({
          scale: this.dynamicScale,
        })
        canvas.width = viewport.width
        canvas.height = viewport.height
        await _page.render({
          canvasContext: context,
          viewport,
        }).promise
        this.measure()
      } finally {
        this.isRendering = false
      }
    },
  },
}
</script>

<style scoped>
canvas {
  display: block;
}
</style>
