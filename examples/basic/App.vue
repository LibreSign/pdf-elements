<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="app-shell">
    <AppToolbar
      :loading="loading"
      :is-ready="isReady"
      :is-adding-element="isAddingElement"
      @load-sample="loadSample"
      @files-change="onFilesChange"
      @add-signature="startAddingSignature"
      @show-objects="showObjects"
      @clear-all="clearAll"
    />

    <DocumentsList :documents="fileNames" @remove="removeDocument" />

    <section class="viewer">
      <PDFElements
        ref="pdf"
        :key="componentKey"
        :init-files="initFiles"
        :init-file-names="fileNames"
        :initial-scale="1.1"
        @pdf-elements:end-init="onReady"
      >
        <template #element-signature="{ object }">
          <SignatureBox
            :object="object"
            :style="{ fontSize: getResponsiveFontSize(object) }"
          />
        </template>

        <template #custom="{ object }">
          <SignatureBox
            :object="object"
            :style="{ fontSize: getResponsiveFontSize(object) }"
          />
        </template>

        <template #actions="{ onDelete }">
          <DeleteButton @delete="onDelete" />
        </template>
      </PDFElements>
    </section>

    <ElementsViewer
      v-if="showElementsViewer && pdf"
      :is-open="showElementsViewer"
      :documents="pdf.pdfDocuments"
      @close="showElementsViewer = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PDFElements from '../../src'
import AppToolbar from './components/AppToolbar.vue'
import DocumentsList from './components/DocumentsList.vue'
import SignatureBox from './components/SignatureBox.vue'
import DeleteButton from './components/DeleteButton.vue'
import ElementsViewer from './components/ElementsViewer.vue'

export default defineComponent({
  name: 'App',
  components: {
    PDFElements,
    AppToolbar,
    DocumentsList,
    SignatureBox,
    DeleteButton,
    ElementsViewer,
  },
  data() {
    return {
      initFiles: ['https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'],
      fileNames: ['sample.pdf'],

      componentKey: 0,
      loading: false,
      pdfReady: false,
      showElementsViewer: false,
      isAddingElement: false,
    }
  },
  computed: {
    isReady() {
      return this.pdfReady && !!this.$refs.pdf
    },
    pdf() {
      return this.$refs.pdf || null
    },
  },
  methods: {
    onReady() {
      this.loading = false
      this.pdfReady = true
    },

    loadSample() {
      this.loading = true
      this.pdfReady = false
      this.initFiles = ['https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf']
      this.fileNames = ['sample.pdf']
      this.forceRenderDocuments()
    },

    onFilesChange(event) {
      const input = event?.target as HTMLInputElement | null
      const files = Array.from(input?.files || [])
      if (files.length === 0) return

      this.loading = true
      this.pdfReady = false
      this.initFiles = [...this.initFiles, ...files]
      this.fileNames = [...this.fileNames, ...files.map((file: File) => file.name)]
      this.forceRenderDocuments()
      if (input) {
        input.value = ''
      }
    },

    removeDocument(index) {
      this.initFiles = this.initFiles.filter((_, i) => i !== index)
      this.fileNames = this.fileNames.filter((_, i) => i !== index)
      if (this.initFiles.length === 0) {
        this.pdfReady = false
      }
      this.forceRenderDocuments()
    },

    clearAll() {
      if (confirm('Clear all documents and objects?')) {
        this.initFiles = []
        this.fileNames = []
        this.pdfReady = false
        this.forceRenderDocuments()
      }
    },

    forceRenderDocuments() {
      this.componentKey += 1
    },

    startAddingSignature() {
      const pdf = this.$refs.pdf
      if (!pdf) return

      this.isAddingElement = true
      pdf.startAddingElement({
        width: 160,
        height: 48,
        type: 'signature',
        label: 'Signature',
        icon: 'signature',
      })

      this.$nextTick(() => {
        const checkAddingMode = () => {
          if (pdf.isAddingMode === false && this.isAddingElement) {
            this.isAddingElement = false
          } else if (pdf.isAddingMode === true) {
            requestAnimationFrame(checkAddingMode)
          }
        }
        requestAnimationFrame(checkAddingMode)
      })
    },

    getResponsiveFontSize(object) {
      const minFontSize = 6
      const maxFontSize = 14
      const baseWidth = 160
      const baseHeight = 48

      const scaleFactor = Math.min(
        object.width / baseWidth,
        object.height / baseHeight
      )

      const adjustedScale = Math.sqrt(scaleFactor)
      const fontSize = Math.max(
        minFontSize,
        Math.min(maxFontSize, maxFontSize * adjustedScale)
      )

      return `${fontSize}px`
    },

    showObjects() {
      this.showElementsViewer = true
    },
  },
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f5f7fa;
  color: #111827;
  font-family: "Inter", "Segoe UI", -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}

.viewer {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
</style>
