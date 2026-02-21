<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div :style="{ width, height }" class="pdf-elements-root">
    <div
      v-if="pdfDocuments.length"
      class="pages-container"
    >
      <div v-for="(pdfDoc, docIndex) in pdfDocuments" :key="docIndex">
        <div v-for="(page, pIndex) in pdfDoc.pages" :key="`${docIndex}-${pIndex}`" class="page-slot">
          <div class="page-wrapper"
            @mousedown="selectPage(docIndex, pIndex)"
            @touchstart="selectPage(docIndex, pIndex)">
            <div class="page-canvas" :class="{ 'shadow-outline': docIndex === selectedDocIndex && pIndex === selectedPageIndex }">
              <PDFPage
                :ref="`page${docIndex}-${pIndex}`"
                :page="page"
                :scale="scale"
                @onMeasure="onMeasure($event, docIndex, pIndex)"
              />
                <div
                class="overlay"
                @mousemove="handleMouseMove"
                @touchmove="handleMouseMove"
                @click="handleOverlayClick(docIndex, pIndex, $event)"
                @touchend="handleOverlayClick(docIndex, pIndex, $event)"
              >
                <div
                  v-if="isAddingMode && previewPageDocIndex === docIndex && previewPageIndex === pIndex && previewElement && previewVisible"
                  class="preview-element"
                  :style="{
                    left: `${previewPosition.x * previewScale.x}px`,
                    top: `${previewPosition.y * previewScale.y}px`,
                    width: `${previewElement.width * previewScale.x}px`,
                    height: `${previewElement.height * previewScale.y}px`,
                  }"
                >
                  <slot
                    :name="previewElement.type ? `element-${previewElement.type}` : 'custom'"
                    :object="previewElement"
                    :isSelected="false"
                  >
                    <slot
                      name="custom"
                      :object="previewElement"
                      :isSelected="false"
                    />
                  </slot>
                </div>

                <DraggableElement
                  v-for="object in pdfDoc.allObjects[pIndex]"
                  :key="object.id"
                  :ref="`draggable${docIndex}-${pIndex}-${object.id}`"
                  :object="object"
                  :pages-scale="getDisplayedPageScale(docIndex, pIndex)"
                  :page-width="getPageWidth(docIndex, pIndex)"
                  :page-height="getPageHeight(docIndex, pIndex)"
                  :read-only="readOnly"
                  :on-update="(payload) => updateObject(docIndex, object.id, payload)"
                  :on-delete="() => deleteObject(docIndex, object.id)"
                  :on-duplicate="() => duplicateObject(docIndex, object.id)"
                  :on-drag-start="(mouseX, mouseY, pointerOffset, dragShift) => startDraggingElement(docIndex, pIndex, object, mouseX, mouseY, pointerOffset, dragShift)"
                  :on-drag-move="updateDraggingPosition"
                  :on-drag-end="stopDraggingElement"
                  :is-being-dragged-globally="isDraggingElement && draggingObject && draggingObject.id === object.id"
                  :dragging-client-pos="draggingClientPosition"
                  :current-doc-index="docIndex"
                  :current-page-index="pIndex"
                  :global-drag-doc-index="draggingDocIndex"
                  :global-drag-page-index="draggingPageIndex"
                  :show-selection-ui="showSelectionHandles && !hideSelectionUI && object.resizable !== false"
                  :show-default-actions="showElementActions && !hideSelectionUI"
                  :ignore-click-outside-selectors="ignoreClickOutsideSelectors"
                >
                  <template #default="slotProps">
                    <slot
                      :name="slotProps.object.type ? `element-${slotProps.object.type}` : 'custom'"
                      :object="slotProps.object"
                      :onDelete="slotProps.onDelete"
                      :onResize="slotProps.onResize"
                    >
                      <slot
                        name="custom"
                        :object="slotProps.object"
                        :onDelete="slotProps.onDelete"
                        :onResize="slotProps.onResize"
                      />
                    </slot>
                  </template>
                  <template #actions="slotProps">
                    <slot
                      name="actions"
                      :object="slotProps.object"
                      :onDelete="slotProps.onDelete"
                      :onDuplicate="slotProps.onDuplicate"
                    />
                  </template>
                </DraggableElement>
              </div>
            </div>
            <div v-if="showPageFooter" class="page-footer">
              <span>{{ pdfDoc.name }}</span>
              <span>{{ formatPageNumber(pIndex + 1, pdfDoc.numPages) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isDraggingElement && draggingObject"
      class="drag-portal"
      :style="{
        position: 'fixed',
        left: `${draggingClientPosition.x}px`,
        top: `${draggingClientPosition.y}px`,
        width: `${draggingObject.width * draggingScale}px`,
        height: `${draggingObject.height * draggingScale}px`,
        pointerEvents: 'none',
      }"
    >
      <slot
        :name="draggingObject.type ? `element-${draggingObject.type}` : 'custom'"
        :object="draggingObject"
        :isSelected="false"
      >
        <slot
          name="custom"
          :object="draggingObject"
          :isSelected="false"
        />
      </slot>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, markRaw } from 'vue'
import PDFPage from './PDFPage.vue'
import DraggableElement from './DraggableElement.vue'
import { readAsPDF, readAsArrayBuffer } from '../utils/asyncReader'
import { clampPosition, getVisibleArea } from '../utils/geometry'
import { getViewportWindow, isPageInViewport } from '../utils/pageBounds'
import { applyScaleToDocs } from '../utils/zoom'
import { objectIdExistsInDoc, findObjectPageIndex, updateObjectInDoc, removeObjectFromDoc } from '../utils/objectStore'
import { getCachedMeasurement } from '../utils/measurements'
import type { PDFDocumentEntry, PDFElementObject } from '../types'

export default defineComponent({
  name: 'PDFElements',
  emits: ['pdf-elements:end-init', 'pdf-elements:delete-object', 'pdf-elements:object-click'],
  components: {
    PDFPage,
    DraggableElement,
  },
  props: {
    width: {
      type: String,
      default: '100%',
    },
    height: {
      type: String,
      default: '100%',
    },
    initFiles: {
      type: Array as PropType<
        (string | Blob | ArrayBuffer | ArrayBufferView | Record<string, unknown>)[]
      >,
      default: () => [],
    },
    initFileNames: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    initialScale: {
      type: Number,
      default: 1,
    },
    showPageFooter: {
      type: Boolean,
      default: true,
    },
    hideSelectionUI: {
      type: Boolean,
      default: false,
    },
    showSelectionHandles: {
      type: Boolean,
      default: true,
    },
    showElementActions: {
      type: Boolean,
      default: true,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    emitObjectClick: {
      type: Boolean,
      default: false,
    },
    ignoreClickOutsideSelectors: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    pageCountFormat: {
      type: String,
      default: '{currentPage} of {totalPages}',
    },
    autoFitZoom: {
      type: Boolean,
      default: false,
    },
    pdfjsOptions: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
  },
  data() {
    return {
      scale: this.initialScale,
      pdfDocuments: [] as PDFDocumentEntry[],
      selectedDocIndex: -1,
      selectedPageIndex: -1,
      isAddingMode: false,
      previewElement: null as PDFElementObject | null,
      previewPosition: { x: 0, y: 0 },
      previewScale: { x: 1, y: 1 },
      previewPageDocIndex: -1,
      previewPageIndex: -1,
      previewVisible: false,
      hoverRafId: 0,
      pendingHoverClientPos: null as { x: number; y: number } | null,
      lastHoverRect: null as DOMRect | null,
      addingListenersAttached: false,
      dragRafId: 0,
      pendingDragClientPos: null as { x: number; y: number } | null,
      pageBoundsVersion: 0,
      lastScrollTop: 0,
      lastClientWidth: 0,
      nextObjectCounter: 0,
      isDraggingElement: false,
      draggingObject: null as PDFElementObject | null,
      draggingDocIndex: -1,
      draggingPageIndex: -1,
      draggingClientPosition: { x: 0, y: 0 },
      draggingScale: 1,
      draggingInitialMouseOffset: { x: 0, y: 0 },
      draggingElementShift: { x: 0, y: 0 },
      lastMouseClientPos: { x: 0, y: 0 },
      viewportRafId: 0,
      objectIndexCache: markRaw({}) as Record<string, number>,
      zoomRafId: null as number | null,
      wheelZoomRafId: null as number | null,
      boundHandleWheel: null as ((event: WheelEvent) => void) | null,
      visualScale: this.initialScale,
      autoFitApplied: false,
      lastContainerWidth: 0,
      _pagesBoundingRects: markRaw({}) as Record<string, { docIndex: number; pageIndex: number; rect: DOMRect }>,
      _pagesBoundingRectsList: markRaw([]) as { docIndex: number; pageIndex: number; rect: DOMRect }[],
      _pageMeasurementCache: markRaw({}) as Record<string, { width: number; height: number }>,
      _lastPageBoundsScrollTop: 0,
      _lastPageBoundsClientHeight: 0,
    }
  },
  mounted() {
    this.boundHandleWheel = this.handleWheel.bind(this)
    this.init()
    window.addEventListener('scroll', this.onViewportScroll, { passive: true })
    window.addEventListener('resize', this.onViewportScroll)
    this.$el?.addEventListener('scroll', this.onViewportScroll, { passive: true })
    this.$el?.addEventListener('wheel', this.boundHandleWheel, { passive: false })
  },
  beforeUnmount() {
    if (this.zoomRafId) {
      cancelAnimationFrame(this.zoomRafId)
    }
    if (this.wheelZoomRafId) {
      cancelAnimationFrame(this.wheelZoomRafId)
      this.wheelZoomRafId = null
    }
    if (this.boundHandleWheel) {
      this.$el?.removeEventListener('wheel', this.boundHandleWheel)
    }
    this.detachAddingListeners()
    window.removeEventListener('scroll', this.onViewportScroll)
    window.removeEventListener('resize', this.onViewportScroll)
    this.$el?.removeEventListener('scroll', this.onViewportScroll)
    if (this.viewportRafId) {
      window.cancelAnimationFrame(this.viewportRafId)
      this.viewportRafId = 0
    }
    if (this.hoverRafId) {
      window.cancelAnimationFrame(this.hoverRafId)
      this.hoverRafId = 0
    }
    if (this.dragRafId) {
      window.cancelAnimationFrame(this.dragRafId)
      this.dragRafId = 0
    }
  },
  methods: {
    async init() {
      if (!this.initFiles || this.initFiles.length === 0) return
      const docs: PDFDocumentEntry[] = []
      this.autoFitApplied = false

      for (let i = 0; i < this.initFiles.length; i++) {
        const file = this.initFiles[i]
        const name = this.initFileNames[i] || `document-${i + 1}.pdf`

        let pdfDoc
        if (file instanceof Blob) {
          const buffer = await readAsArrayBuffer(file)
          pdfDoc = await readAsPDF({ data: buffer }, this.pdfjsOptions)
        } else {
          pdfDoc = await readAsPDF(file, this.pdfjsOptions)
        }

        const pages = []
        const pageWidths = Array(pdfDoc.numPages).fill(0)
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const pagePromise = pdfDoc.getPage(p)
          pagePromise.then((page) => {
            pageWidths.splice(p - 1, 1, page.getViewport({ scale: 1 }).width)
            if (this.autoFitZoom) {
              this.scheduleAutoFitZoom()
            }
          })
          pages.push(pagePromise)
        }

        const rawPages = markRaw(pages)

        docs.push({
          name,
          file,
          pdfDoc: markRaw(pdfDoc),
          numPages: pdfDoc.numPages,
          pages: rawPages,
          pageWidths,
          pagesScale: Array(pdfDoc.numPages).fill(this.scale),
          allObjects: Array(pdfDoc.numPages).fill(0).map(() => []),
        })
      }

      this.pdfDocuments = docs
      this._pageMeasurementCache = markRaw({})
      if (docs.length) {
        this.selectedDocIndex = 0
        this.selectedPageIndex = 0
        this.$emit('pdf-elements:end-init', { docsCount: docs.length })
        this.$nextTick(() => {
          if (this.autoFitZoom) {
            this.scheduleAutoFitZoom()
          }
        })
      }
    },

    selectPage(docIndex, pageIndex) {
      this.selectedDocIndex = docIndex
      this.selectedPageIndex = pageIndex
    },

    startDraggingElement(docIndex, pageIndex, object, mouseX, mouseY, pointerOffset, dragShift) {
      this.isDraggingElement = true
      this.draggingObject = { ...object }
      this.draggingDocIndex = docIndex
      this.draggingPageIndex = pageIndex
      this.draggingScale = this.getDisplayedPageScale(docIndex, pageIndex)
      this.lastMouseClientPos.x = mouseX
      this.lastMouseClientPos.y = mouseY
      this.draggingElementShift = dragShift && typeof dragShift.x === 'number' && typeof dragShift.y === 'number'
        ? dragShift
        : { x: 0, y: 0 }

      this.cachePageBounds()
      const pageRect = this.getPageRect(docIndex, pageIndex)
      if (pointerOffset && typeof pointerOffset.x === 'number' && typeof pointerOffset.y === 'number') {
        this.draggingInitialMouseOffset.x = pointerOffset.x
        this.draggingInitialMouseOffset.y = pointerOffset.y
        this.draggingClientPosition.x = mouseX - this.draggingInitialMouseOffset.x
        this.draggingClientPosition.y = mouseY - this.draggingInitialMouseOffset.y
      } else if (pageRect) {
        const elementScreenX = pageRect.left + (object.x * this.draggingScale)
        const elementScreenY = pageRect.top + (object.y * this.draggingScale)
        this.draggingInitialMouseOffset.x = mouseX - elementScreenX
        this.draggingInitialMouseOffset.y = mouseY - elementScreenY

        this.draggingClientPosition.x = mouseX - this.draggingInitialMouseOffset.x
        this.draggingClientPosition.y = mouseY - this.draggingInitialMouseOffset.y
      }

    },

    updateDraggingPosition(clientX, clientY) {
      if (!this.isDraggingElement) return

      if (this.pendingDragClientPos) {
        this.pendingDragClientPos.x = clientX
        this.pendingDragClientPos.y = clientY
      } else {
        this.pendingDragClientPos = { x: clientX, y: clientY }
      }
      if (this.dragRafId) return
      this.dragRafId = window.requestAnimationFrame(() => {
        this.dragRafId = 0
        const pending = this.pendingDragClientPos
        if (!pending) return
        this.lastMouseClientPos.x = pending.x
        this.lastMouseClientPos.y = pending.y
        this.draggingClientPosition.x = pending.x - this.draggingInitialMouseOffset.x
        this.draggingClientPosition.y = pending.y - this.draggingInitialMouseOffset.y
      })
    },

    stopDraggingElement() {
      if (this.draggingObject) {
        const objectId = this.draggingObject.id
        const originalDocIndex = this.draggingDocIndex

        const finalPageIndex = this.checkAndMoveObjectPage(
          this.draggingDocIndex,
          objectId,
          this.lastMouseClientPos.x,
          this.lastMouseClientPos.y
        )

        if (finalPageIndex !== undefined) {
          this.$nextTick(() => {
            this.selectPage(originalDocIndex, finalPageIndex)

            const refKey = `draggable${originalDocIndex}-${finalPageIndex}-${objectId}`
            const draggableRefs = this.$refs[refKey]
            if (draggableRefs && Array.isArray(draggableRefs) && draggableRefs[0]) {
              draggableRefs[0].isSelected = true
            }
          })
        }
      }
      this.isDraggingElement = false
      this.draggingObject = null
      this.draggingDocIndex = -1
      this.draggingPageIndex = -1
      this.draggingElementShift = { x: 0, y: 0 }
      this.pendingDragClientPos = null
    },

    startAddingElement(templateObject) {
      if (!this.pdfDocuments.length) return
      this.attachAddingListeners()
      this.isAddingMode = true
      this.previewElement = { ...templateObject }
      this.previewPageDocIndex = 0
      this.previewPageIndex = 0
      this.previewVisible = false
      this.previewScale = { x: 1, y: 1 }
      this.cachePageBounds()
    },

    cachePageBounds() {
      const nextRects = {}
      const nextList = []
      const container = this.$el
      const scrollTop = container?.scrollTop || 0
      const viewHeight = container?.clientHeight || 0
      if (!this.isAddingMode && !this.isDraggingElement &&
        scrollTop === this._lastPageBoundsScrollTop &&
        viewHeight === this._lastPageBoundsClientHeight) {
        return
      }
      this._lastPageBoundsScrollTop = scrollTop
      this._lastPageBoundsClientHeight = viewHeight
      const { minY, maxY } = getViewportWindow(scrollTop, viewHeight)
      for (let docIdx = 0; docIdx < this.pdfDocuments.length; docIdx++) {
        for (let pageIdx = 0; pageIdx < this.pdfDocuments[docIdx].pages.length; pageIdx++) {
          const canvas = this.getPageCanvasElement(docIdx, pageIdx)
          if (!canvas) continue
          if (viewHeight) {
            const wrapper = canvas.closest('.page-wrapper') || canvas
            const offsetTop = wrapper.offsetTop || 0
            const offsetHeight = wrapper.offsetHeight || 0
            if (!isPageInViewport(offsetTop, offsetHeight, minY, maxY)) {
              continue
            }
          }
          const rect = canvas.getBoundingClientRect()
          const entry = {
            docIndex: docIdx,
            pageIndex: pageIdx,
            rect,
          }
          nextRects[`${docIdx}-${pageIdx}`] = entry
          nextList.push(entry)
        }
      }
      this._pagesBoundingRects = markRaw(nextRects)
      this._pagesBoundingRectsList = markRaw(nextList)
      this.pageBoundsVersion++
    },
    cachePageBoundsForPage(docIndex, pageIndex) {
      const canvas = this.getPageCanvasElement(docIndex, pageIndex)
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const nextRects = {
        ...this._pagesBoundingRects,
        [`${docIndex}-${pageIndex}`]: {
          docIndex,
          pageIndex,
          rect,
        },
      }
      this._pagesBoundingRects = markRaw(nextRects)
      this._pagesBoundingRectsList = markRaw(Object.values(nextRects))
      this.pageBoundsVersion++
    },
    getPageBoundsMap() {
      return this._pagesBoundingRects || {}
    },
    getPageBoundsList() {
      return this._pagesBoundingRectsList || []
    },
    getPageRect(docIndex, pageIndex) {
      return this.getPageBoundsMap()[`${docIndex}-${pageIndex}`]?.rect || null
    },
    getPointerPosition(event) {
      if (event?.type?.includes?.('touch')) {
        return {
          x: event.touches?.[0]?.clientX,
          y: event.touches?.[0]?.clientY,
        }
      }
      return {
        x: event?.clientX,
        y: event?.clientY,
      }
    },

    getDisplayedPageScale(docIndex, pageIndex) {
      void this.pageBoundsVersion
      const doc = this.pdfDocuments[docIndex]
      if (!doc) return 1
      const baseWidth = doc.pageWidths?.[pageIndex] || 0
      const pageBoundsMap = this.getPageBoundsMap()
      if (!pageBoundsMap[`${docIndex}-${pageIndex}`]) {
        this.cachePageBoundsForPage(docIndex, pageIndex)
      }
      const rectWidth = this.getPageBoundsMap()[`${docIndex}-${pageIndex}`]?.rect?.width || 0
      if (rectWidth && baseWidth) {
        return rectWidth / baseWidth
      }
      if (this.isAddingMode || this.isDraggingElement) {
        const canvas = this.getPageCanvasElement(docIndex, pageIndex)
        const fallbackRectWidth = canvas?.getBoundingClientRect?.().width || 0
        if (fallbackRectWidth && baseWidth) {
          return fallbackRectWidth / baseWidth
        }
      }
      const base = doc.pagesScale[pageIndex] || 1
      const factor = this.visualScale && this.scale ? (this.visualScale / this.scale) : 1
      return base * factor
    },
    getPageComponent(docIndex, pageIndex) {
      const pageRef = this.$refs[`page${docIndex}-${pageIndex}`]
      return pageRef && Array.isArray(pageRef) && pageRef[0] ? pageRef[0] : null
    },
    getPageCanvasElement(docIndex, pageIndex) {
      const pageComponent = this.getPageComponent(docIndex, pageIndex)
      return pageComponent ? (pageComponent.$el || pageComponent) : null
    },

    onViewportScroll() {
      if (this.viewportRafId) return
      this.viewportRafId = window.requestAnimationFrame(() => {
        const container = this.$el
        const scrollTop = container?.scrollTop || 0
        const clientWidth = container?.clientWidth || 0
        const scrollChanged = scrollTop !== this.lastScrollTop
        const widthChanged = clientWidth !== this.lastClientWidth
        this.lastScrollTop = scrollTop
        this.lastClientWidth = clientWidth

        if (this.isAddingMode || this.isDraggingElement) {
          if (scrollChanged || widthChanged) {
            this.cachePageBounds()
          }
        }
        if (this.autoFitZoom && !this.isAddingMode && !this.isDraggingElement) {
          if (clientWidth && widthChanged) {
            this.lastContainerWidth = clientWidth
            this.autoFitApplied = false
            this.scheduleAutoFitZoom()
          }
        }
        this.viewportRafId = 0
      })
    },

    handleMouseMove(event) {
      if (!this.isAddingMode || !this.previewElement) return
      const { x, y } = this.getPointerPosition(event)
      if (x === undefined || y === undefined) return
      if (this.pendingHoverClientPos) {
        this.pendingHoverClientPos.x = x
        this.pendingHoverClientPos.y = y
      } else {
        this.pendingHoverClientPos = { x, y }
      }
      if (this.hoverRafId) return
      this.hoverRafId = window.requestAnimationFrame(() => {
        this.hoverRafId = 0
        const pending = this.pendingHoverClientPos
        if (!pending) return

        const cursorX = pending.x
        const cursorY = pending.y
        let target = null

        if (this.lastHoverRect &&
          cursorX >= this.lastHoverRect.left && cursorX <= this.lastHoverRect.right &&
          cursorY >= this.lastHoverRect.top && cursorY <= this.lastHoverRect.bottom) {
          target = {
            docIndex: this.previewPageDocIndex,
            pageIndex: this.previewPageIndex,
            rect: this.lastHoverRect,
          }
        } else {
          const rectEntries = this.getPageBoundsList().length
            ? this.getPageBoundsList()
            : Object.values(this.getPageBoundsMap())
          for (let i = 0; i < rectEntries.length; i++) {
            const entry = rectEntries[i]
            const rect = entry.rect
            if (cursorX >= rect.left && cursorX <= rect.right &&
                cursorY >= rect.top && cursorY <= rect.bottom) {
              target = entry
              break
            }
          }
        }

        if (!target) {
          this.previewVisible = false
          this.previewScale = { x: 1, y: 1 }
          this.lastHoverRect = null
          return
        }

        this.previewPageDocIndex = target.docIndex
        this.previewPageIndex = target.pageIndex
        this.lastHoverRect = target.rect
        const canvasEl = this.getPageCanvasElement(target.docIndex, target.pageIndex)
        const pagesScale = this.pdfDocuments[target.docIndex]?.pagesScale?.[target.pageIndex] || 1
        const renderWidth = canvasEl?.width || target.rect.width
        const renderHeight = canvasEl?.height || target.rect.height
        const layoutScaleX = renderWidth ? target.rect.width / renderWidth : 1
        const layoutScaleY = renderHeight ? target.rect.height / renderHeight : 1
        const relX = (cursorX - target.rect.left) / layoutScaleX / pagesScale
        const relY = (cursorY - target.rect.top) / layoutScaleY / pagesScale

        const pageWidth = renderWidth / pagesScale
        const pageHeight = renderHeight / pagesScale
        this.previewScale.x = pagesScale
        this.previewScale.y = pagesScale
        let x = relX - this.previewElement.width / 2
        let y = relY - this.previewElement.height / 2

        x = Math.max(0, Math.min(x, pageWidth - this.previewElement.width))
        y = Math.max(0, Math.min(y, pageHeight - this.previewElement.height))

        this.previewPosition.x = x
        this.previewPosition.y = y
        this.previewVisible = true
      })
    },
    handleOverlayClick(docIndex, pageIndex, event) {
      if (!this.emitObjectClick) return

      const { x: clientX, y: clientY } = this.getPointerPosition(event)
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return

      this.cachePageBoundsForPage(docIndex, pageIndex)
      const pageRect = this.getPageRect(docIndex, pageIndex)
      if (!pageRect) return

      const pagesScale = this.getDisplayedPageScale(docIndex, pageIndex) || 1
      const relX = (clientX - pageRect.left) / pagesScale
      const relY = (clientY - pageRect.top) / pagesScale

      const doc = this.pdfDocuments?.[docIndex]
      const pageObjects = doc?.allObjects?.[pageIndex] || []
      if (pageObjects.length === 0) return
      let hitObject = null

      for (let i = pageObjects.length - 1; i >= 0; i--) {
        const object = pageObjects[i]
        const x = Number(object.x)
        const y = Number(object.y)
        const width = Number(object.width)
        const height = Number(object.height)
        if (![x, y, width, height].every(Number.isFinite)) {
          continue
        }
        if (relX >= x && relX <= x + width && relY >= y && relY <= y + height) {
          hitObject = object
          break
        }
      }

      if (!hitObject) return

      this.$emit('pdf-elements:object-click', {
        docIndex,
        pageIndex,
        object: hitObject,
        event,
      })
    },

    handleKeyDown(event) {
      if (event.key === 'Escape' && this.isAddingMode) {
        this.cancelAdding()
      }
    },

    handleWheel(event) {
      if (!event.ctrlKey) return
      event.preventDefault()

      const factor = 1 - (event.deltaY * 0.002)
      const nextVisual = Math.max(0.5, Math.min(3.0, this.visualScale * factor))
      this.visualScale = nextVisual
      if (this.wheelZoomRafId) return
      this.wheelZoomRafId = window.requestAnimationFrame(() => {
        this.wheelZoomRafId = null
        this.commitZoom()
      })
    },

    commitZoom() {
      const newScale = this.visualScale

      this.scale = newScale

      applyScaleToDocs(this.pdfDocuments, this.scale)

      this._pageMeasurementCache = markRaw({})
      this.cachePageBounds()
    },

    finishAdding() {
      if (!this.isAddingMode || !this.previewElement) return
      if (!this.previewVisible) return

      const objectToAdd = {
        ...this.previewElement,
        id: this.generateObjectId(),
        x: Math.round(this.previewPosition.x),
        y: Math.round(this.previewPosition.y),
      }

      const doc = this.pdfDocuments[this.previewPageDocIndex]
      const pageWidth = this.getPageWidth(this.previewPageDocIndex, this.previewPageIndex)
      const pageHeight = this.getPageHeight(this.previewPageDocIndex, this.previewPageIndex)

      if (objectToAdd.x < 0 || objectToAdd.y < 0 ||
          objectToAdd.x + objectToAdd.width > pageWidth ||
          objectToAdd.y + objectToAdd.height > pageHeight) {
        this.cancelAdding()
        return
      }

      doc.allObjects[this.previewPageIndex].push(objectToAdd)

      const pageIndex = this.previewPageIndex
      const docIndex = this.previewPageDocIndex
      const objectId = objectToAdd.id

      this.cancelAdding()

      this.$nextTick(() => {
        const refKey = `draggable${docIndex}-${pageIndex}-${objectId}`
        const draggableRefs = this.$refs[refKey]
        if (draggableRefs && Array.isArray(draggableRefs) && draggableRefs[0]) {
          draggableRefs[0].isSelected = true
        }
      })
    },

    cancelAdding() {
      this.isAddingMode = false
      this.previewElement = null
      this.previewVisible = false
      this.detachAddingListeners()
    },
    generateObjectId() {
      const counter = this.nextObjectCounter++
      const rand = Math.random().toString(36).slice(2, 8)
      return `obj-${Date.now()}-${counter}-${rand}`
    },
    attachAddingListeners() {
      if (this.addingListenersAttached) return
      this.addingListenersAttached = true
      document.addEventListener('mousemove', this.handleMouseMove)
      document.addEventListener('touchmove', this.handleMouseMove, { passive: true })
      document.addEventListener('mouseup', this.finishAdding)
      document.addEventListener('touchend', this.finishAdding)
      document.addEventListener('keydown', this.handleKeyDown)
    },
    detachAddingListeners() {
      if (!this.addingListenersAttached) return
      this.addingListenersAttached = false
      document.removeEventListener('mousemove', this.handleMouseMove)
      document.removeEventListener('touchmove', this.handleMouseMove)
      document.removeEventListener('mouseup', this.finishAdding)
      document.removeEventListener('touchend', this.finishAdding)
      document.removeEventListener('keydown', this.handleKeyDown)
    },

    addObjectToPage(object, pageIndex = this.selectedPageIndex, docIndex = this.selectedDocIndex) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return false
      if (pageIndex < 0 || pageIndex >= this.pdfDocuments[docIndex].pages.length) return false

      const doc = this.pdfDocuments[docIndex]
      const pageRef = this.getPageComponent(docIndex, pageIndex)
      if (!pageRef) return false

      let objectToAdd = object
      if (!objectToAdd.id || this.objectIdExists(docIndex, objectToAdd.id)) {
        objectToAdd = { ...objectToAdd, id: this.generateObjectId() }
      }

      const measurement = this.getCachedMeasurement(docIndex, pageIndex, pageRef)
      const pageWidth = measurement.width
      const pageHeight = measurement.height

      if (objectToAdd.x < 0 || objectToAdd.y < 0 ||
          objectToAdd.x + objectToAdd.width > pageWidth ||
          objectToAdd.y + objectToAdd.height > pageHeight) {
        return false
      }

      doc.allObjects[pageIndex].push(objectToAdd)
      this.objectIndexCache[`${docIndex}-${objectToAdd.id}`] = pageIndex
      return true
    },
    objectIdExists(docIndex, objectId) {
      if (!objectId) return false
      const cacheKey = `${docIndex}-${objectId}`
      if (this.objectIndexCache[cacheKey] !== undefined) return true
      const doc = this.pdfDocuments[docIndex]
      return objectIdExistsInDoc(doc, objectId)
    },
    updateObjectInPage(docIndex, pageIndex, objectId, payload) {
      const doc = this.pdfDocuments[docIndex]
      updateObjectInDoc(doc, pageIndex, objectId, payload)
    },
    removeObjectFromPage(docIndex, pageIndex, objectId) {
      const doc = this.pdfDocuments[docIndex]
      removeObjectFromDoc(doc, pageIndex, objectId)
    },

    getAllObjects(docIndex = this.selectedDocIndex) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return []

      const doc = this.pdfDocuments[docIndex]
      const result = []

      doc.allObjects.forEach((pageObjects, pageIndex) => {
        const pageRef = this.getPageComponent(docIndex, pageIndex)
        if (!pageRef) return
        const measurement = this.getCachedMeasurement(docIndex, pageIndex, pageRef)
        const normalizedCanvasHeight = measurement.height
        const pagesScale = doc.pagesScale[pageIndex] || 1

        pageObjects.forEach(object => {
          result.push({
            ...object,
            pageIndex,
            pageNumber: pageIndex + 1,
            scale: pagesScale,
            normalizedCoordinates: {
              llx: Math.round(object.x),
              lly: Math.round(normalizedCanvasHeight - object.y),
              ury: Math.round(normalizedCanvasHeight - object.y - object.height),
              width: Math.round(object.width),
              height: Math.round(object.height),
            },
          })
        })
      })

      return result
    },

    updateObject(docIndex, objectId, payload) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return
      const doc = this.pdfDocuments[docIndex]

      const cacheKey = `${docIndex}-${objectId}`
      let currentPageIndex = this.objectIndexCache[cacheKey]

      if (currentPageIndex === undefined) {
        currentPageIndex = findObjectPageIndex(doc, objectId)
        if (currentPageIndex !== undefined) {
          this.objectIndexCache[cacheKey] = currentPageIndex
        }
      }

      if (currentPageIndex === undefined) return

      const targetObject = doc.allObjects[currentPageIndex]?.find(o => o.id === objectId)
      if (!targetObject) return

      if (payload._globalDrag && payload._mouseX !== undefined && payload._mouseY !== undefined) {
        const mouseX = payload._mouseX
        const mouseY = payload._mouseY

        const pageBoundsMap = this.getPageBoundsMap()
        if (!pageBoundsMap || Object.keys(pageBoundsMap).length === 0) {
          this.cachePageBounds()
        }

        const currentPageRect = this.getPageRect(docIndex, currentPageIndex)
        if (currentPageRect) {
          const pagesScale = this.getDisplayedPageScale(docIndex, currentPageIndex)
          const relX = (mouseX - currentPageRect.left - this.draggingElementShift.x) / pagesScale - (this.draggingInitialMouseOffset.x / pagesScale)
          const relY = (mouseY - currentPageRect.top - this.draggingElementShift.y) / pagesScale - (this.draggingInitialMouseOffset.y / pagesScale)

          this.updateObjectInPage(docIndex, currentPageIndex, objectId, { x: relX, y: relY })
        }
        return
      }

      if (payload.x !== undefined || payload.y !== undefined) {
        const newX = payload.x !== undefined ? payload.x : targetObject.x
        const newY = payload.y !== undefined ? payload.y : targetObject.y
        const objWidth = payload.width !== undefined ? payload.width : targetObject.width
        const objHeight = payload.height !== undefined ? payload.height : targetObject.height

        const { width: currentPageWidth, height: currentPageHeight } = this.getPageSize(docIndex, currentPageIndex)
        if (newX >= 0 && newY >= 0 &&
            newX + objWidth <= currentPageWidth &&
            newY + objHeight <= currentPageHeight) {
          this.updateObjectInPage(docIndex, currentPageIndex, objectId, payload)
          return
        }

        let bestPageIndex = currentPageIndex
        let maxVisibleArea = 0

        for (let pIndex = 0; pIndex < doc.pages.length; pIndex++) {
          const pageWidth = this.getPageWidth(docIndex, pIndex)
          const pageHeight = this.getPageHeight(docIndex, pIndex)

          const visibleArea = getVisibleArea(newX, newY, objWidth, objHeight, pageWidth, pageHeight)
          if (visibleArea > maxVisibleArea) {
            maxVisibleArea = visibleArea
            bestPageIndex = pIndex
          }
        }

        if (bestPageIndex !== currentPageIndex) {
          const { width: pageWidth, height: pageHeight } = this.getPageSize(docIndex, bestPageIndex)
          const { x: adjustedX, y: adjustedY } = clampPosition(newX, newY, objWidth, objHeight, pageWidth, pageHeight)

          this.removeObjectFromPage(docIndex, currentPageIndex, objectId)
          const updatedObject = {
            ...targetObject,
            ...payload,
            x: adjustedX,
            y: adjustedY,
          }
          doc.allObjects[bestPageIndex].push(updatedObject)
          this.objectIndexCache[`${docIndex}-${objectId}`] = bestPageIndex
          return
        }

        const { width: pageWidth, height: pageHeight } = this.getPageSize(docIndex, currentPageIndex)

        if (newX < 0 || newY < 0 ||
            newX + objWidth > pageWidth ||
            newY + objHeight > pageHeight) {
          return
        }
      }

      this.updateObjectInPage(docIndex, currentPageIndex, objectId, payload)
    },

    deleteObject(docIndex, objectId) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return
      const doc = this.pdfDocuments[docIndex]
      let deletedObject = null
      let deletedPageIndex = -1

      doc.allObjects.some((objects, pageIndex) => {
        const objectIndex = objects.findIndex(object => object.id === objectId)
        if (objectIndex === -1) {
          return false
        }
        deletedObject = objects[objectIndex]
        deletedPageIndex = pageIndex
        objects.splice(objectIndex, 1)
        return true
      })
      delete this.objectIndexCache[`${docIndex}-${objectId}`]
      if (deletedObject) {
        this.$emit('pdf-elements:delete-object', {
          object: deletedObject,
          docIndex,
          pageIndex: deletedPageIndex,
        })
      }
    },
    duplicateObject(docIndex, objectId) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return
      const doc = this.pdfDocuments[docIndex]

      const cacheKey = `${docIndex}-${objectId}`
      let pageIndex = this.objectIndexCache[cacheKey]

      if (pageIndex === undefined) {
        pageIndex = findObjectPageIndex(doc, objectId)
        if (pageIndex !== undefined) {
          this.objectIndexCache[cacheKey] = pageIndex
        }
      }

      if (pageIndex === undefined) return

      const sourceObject = doc.allObjects[pageIndex]?.find(o => o.id === objectId)
      if (!sourceObject) return

      const { width: pageWidth, height: pageHeight } = this.getPageSize(docIndex, pageIndex)
      const offset = 12
      const { x, y } = clampPosition(
        sourceObject.x + offset,
        sourceObject.y + offset,
        sourceObject.width,
        sourceObject.height,
        pageWidth,
        pageHeight,
      )

      let duplicatedSigner = sourceObject.signer
      if (duplicatedSigner?.element && Object.prototype.hasOwnProperty.call(duplicatedSigner.element, 'elementId')) {
        duplicatedSigner = {
          ...duplicatedSigner,
          element: { ...duplicatedSigner.element },
        }
        delete duplicatedSigner.element.elementId
      }

      const duplicatedObject = {
        ...sourceObject,
        id: this.generateObjectId(),
        x,
        y,
        signer: duplicatedSigner,
      }

      doc.allObjects[pageIndex].push(duplicatedObject)
      this.objectIndexCache[`${docIndex}-${duplicatedObject.id}`] = pageIndex

      this.$nextTick(() => {
        const refKey = `draggable${docIndex}-${pageIndex}-${duplicatedObject.id}`
        const draggableRefs = this.$refs[refKey]
        if (draggableRefs && Array.isArray(draggableRefs) && draggableRefs[0]) {
          draggableRefs[0].isSelected = true
        }
      })
    },

    checkAndMoveObjectPage(docIndex, objectId, mouseX, mouseY) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return undefined
      const doc = this.pdfDocuments[docIndex]

      const cacheKey = `${docIndex}-${objectId}`
      let currentPageIndex = this.objectIndexCache[cacheKey]

      if (currentPageIndex === undefined) {
        currentPageIndex = findObjectPageIndex(doc, objectId)
        if (currentPageIndex !== undefined) {
          this.objectIndexCache[cacheKey] = currentPageIndex
        }
      }

      if (currentPageIndex === undefined) return undefined

      const targetObject = doc.allObjects[currentPageIndex]?.find(o => o.id === objectId)
      if (!targetObject) return currentPageIndex

      let targetPageIndex = currentPageIndex
      const pageBoundsList = this.getPageBoundsList()
      const pageBoundsMap = this.getPageBoundsMap()
      const boundsEntries = pageBoundsList.length ? pageBoundsList : Object.values(pageBoundsMap)
      for (let i = 0; i < boundsEntries.length; i++) {
        const { docIndex: rectDocIndex, pageIndex, rect } = boundsEntries[i]
        if (rectDocIndex === docIndex &&
            mouseX >= rect.left && mouseX <= rect.right &&
            mouseY >= rect.top && mouseY <= rect.bottom) {
          targetPageIndex = pageIndex
          break
        }
      }

      const targetPageRect = this.getPageRect(docIndex, targetPageIndex)
      if (!targetPageRect) return currentPageIndex

      const pagesScale = this.getDisplayedPageScale(docIndex, targetPageIndex)
      const relX = (mouseX - targetPageRect.left - this.draggingElementShift.x) / pagesScale - (this.draggingInitialMouseOffset.x / pagesScale)
      const relY = (mouseY - targetPageRect.top - this.draggingElementShift.y) / pagesScale - (this.draggingInitialMouseOffset.y / pagesScale)

      const { width: pageWidth, height: pageHeight } = this.getPageSize(docIndex, targetPageIndex)
      const { x: clampedX, y: clampedY } = clampPosition(
        relX,
        relY,
        targetObject.width,
        targetObject.height,
        pageWidth,
        pageHeight,
      )

      if (targetPageIndex !== currentPageIndex) {
        this.removeObjectFromPage(docIndex, currentPageIndex, objectId)
        doc.allObjects[targetPageIndex].push({
          ...targetObject,
          x: clampedX,
          y: clampedY,
        })
        this.objectIndexCache[cacheKey] = targetPageIndex
      } else if (clampedX !== targetObject.x || clampedY !== targetObject.y) {
        this.updateObjectInPage(docIndex, currentPageIndex, objectId, { x: clampedX, y: clampedY })
      }

      return targetPageIndex
    },

    onMeasure(e, docIndex, pageIndex) {
      if (docIndex < 0 || docIndex >= this.pdfDocuments.length) return
      this.pdfDocuments[docIndex].pagesScale.splice(pageIndex, 1, e.scale)
      this._pageMeasurementCache[`${docIndex}-${pageIndex}`] = null
      this.cachePageBoundsForPage(docIndex, pageIndex)
      if (this.autoFitZoom) {
        this.scheduleAutoFitZoom()
      }
    },

    formatPageNumber(currentPage, totalPages) {
      return this.pageCountFormat
        .replace('{currentPage}', currentPage)
        .replace('{totalPages}', totalPages)
    },
    getPageWidth(docIndex, pageIndex) {
      const pageRef = this.getPageComponent(docIndex, pageIndex)
      if (!pageRef) return 0
      const measurement = this.getCachedMeasurement(docIndex, pageIndex, pageRef)
      return measurement.width
    },
    getPageHeight(docIndex, pageIndex) {
      const pageRef = this.getPageComponent(docIndex, pageIndex)
      if (!pageRef) return 0
      const measurement = this.getCachedMeasurement(docIndex, pageIndex, pageRef)
      return measurement.height
    },
    getPageSize(docIndex, pageIndex) {
      return {
        width: this.getPageWidth(docIndex, pageIndex),
        height: this.getPageHeight(docIndex, pageIndex),
      }
    },
    getCachedMeasurement(docIndex, pageIndex, pageRef) {
      const cacheKey = `${docIndex}-${pageIndex}`
      const doc = this.pdfDocuments[docIndex]
      const pagesScale = doc.pagesScale[pageIndex] || 1
      return getCachedMeasurement(this._pageMeasurementCache, cacheKey, pageRef, pagesScale)
    },
    calculateOptimalScale(maxPageWidth) {
      const containerWidth = this.$el?.clientWidth || 0
      if (!containerWidth || !maxPageWidth) return 1

      const availableWidth = containerWidth - 40
      return Math.max(0.1, Math.min(2, availableWidth / maxPageWidth))
    },
    scheduleAutoFitZoom() {
      if (this.autoFitApplied) return
      if (this.zoomRafId) return
      this.zoomRafId = window.requestAnimationFrame(() => {
        this.zoomRafId = 0
        this.adjustZoomToFit()
      })
    },
    adjustZoomToFit() {
      if (!this.autoFitZoom || this.autoFitApplied || !this.pdfDocuments.length) return

      const widths = this.pdfDocuments
        .flatMap(doc => doc.pageWidths || [])
        .filter(width => width > 0)

      let maxCanvasWidth = 0
      if (widths.length) {
        maxCanvasWidth = Math.max(...widths)
      } else {
        if (this.autoFitZoom) {
          this.scheduleAutoFitZoom()
          return
        }
        const canvases = this.$el?.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement> | undefined
        if (!canvases?.length) return
        maxCanvasWidth = Math.max(...Array.from(canvases).map(canvas =>
          canvas.width / (this.scale || 1),
        ))
      }

      const optimalScale = this.calculateOptimalScale(maxCanvasWidth)
      this.autoFitApplied = true
      if (Math.abs(optimalScale - this.scale) > 0.01) {
        this.scale = optimalScale
        this.visualScale = optimalScale
        applyScaleToDocs(this.pdfDocuments, this.scale)
        this._pageMeasurementCache = markRaw({})
        this.cachePageBounds()
      }
    },
  },
})
</script>

<style scoped>
.pdf-elements-root {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}
.pages-container {
  width: 100%;
  padding: 20px 0 0 0;
  text-align: center;
  background: #f7fafc;
  overflow: hidden;
}
.page-slot {
  margin: 0 auto;
}
.page-wrapper {
  display: inline-block;
  margin-bottom: 0;
}
.page-canvas {
  position: relative;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
}
.shadow-outline {
  box-shadow: 0 0 0 3px rgb(66 153 225 / 50%);
}
.preview-element {
  position: absolute;
  opacity: 0.7;
  pointer-events: none;
}
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  width: 100%;
  height: 100%;
}
.page-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px 20px 20px;
  color: #4b5563;
  font-size: 14px;
}
</style>
