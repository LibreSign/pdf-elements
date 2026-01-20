<!--
SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="draggable-wrapper">
    <div
      v-if="isSelected && !isBeingDraggedGlobally && showSelectionUi && showDefaultActions"
      class="actions-toolbar"
      :style="toolbarStyle"
    >
      <slot name="actions" :object="object" :onDelete="onDelete">
        <button class="action-btn" type="button" title="Delete" @click.stop="onDelete">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1h.5v10.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V3.5h.5a.5.5 0 0 0 0-1H11Zm1 1v10.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V3.5h8Z"/>
          </svg>
        </button>
      </slot>
    </div>
    <div
      class="draggable-element"
      draggable="false"
      @dragstart.prevent
      :class="{ selected: isSelected && showSelectionUi }"
      :style="[elementStyle, dragElementStyle]"
      @mousedown="handleElementClick"
      @touchstart="handleElementClick"
    >
      <slot
        :object="object"
        :isSelected="isSelected"
        :onDelete="onDelete"
        :onResize="startResizeFromSlot"
      />

      <template v-if="isSelected && showSelectionUi">
        <button
          v-for="dir in resizeDirections"
          :key="dir"
          class="resize-handle"
          :class="`handle-${dir}`"
          type="button"
          @mousedown.stop.prevent="startResize(dir, $event)"
          @touchstart.stop.prevent="startResize(dir, $event)"
        />
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DraggableElement',
  props: {
    object: {
      type: Object,
      required: true,
    },
    pagesScale: {
      type: Number,
      default: 1,
    },
    pageWidth: {
      type: Number,
      required: true,
    },
    pageHeight: {
      type: Number,
      required: true,
    },
    onUpdate: {
      type: Function,
      default: () => {},
    },
    onDelete: {
      type: Function,
      default: () => {},
    },
    onDragStart: {
      type: Function,
      default: () => {},
    },
    onDragMove: {
      type: Function,
      default: () => {},
    },
    onDragEnd: {
      type: Function,
      default: () => {},
    },
    isBeingDraggedGlobally: {
      type: Boolean,
      default: false,
    },
    draggingClientPos: {
      type: Object,
      default: () => ({ x: 0, y: 0 }),
    },
    currentDocIndex: {
      type: Number,
      default: -1,
    },
    currentPageIndex: {
      type: Number,
      default: -1,
    },
    globalDragDocIndex: {
      type: Number,
      default: -1,
    },
    globalDragPageIndex: {
      type: Number,
      default: -1,
    },
    showSelectionUi: {
      type: Boolean,
      default: true,
    },
    showDefaultActions: {
      type: Boolean,
      default: true,
    },
    readOnly: {
      type: Boolean,
      default: false,
    }
  },
  data() {
    return {
      isSelected: false,
      mode: 'idle',
      direction: '',
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      startWidth: 0,
      startHeight: 0,
      offsetX: 0,
      offsetY: 0,
      resizeOffsetX: 0,
      resizeOffsetY: 0,
      resizeOffsetW: 0,
      resizeOffsetH: 0,
      aspectRatio: 1,
      lastMouseX: 0,
      lastMouseY: 0,
      pointerOffsetDoc: { x: 0, y: 0 },
      currentPageRect: null,
      rafId: null,
    }
  },
  computed: {
    resizeDirections() {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    },
    elementStyle() {
      const scale = this.pagesScale || 1
      const isDragging = this.mode === 'drag'
      const isResizing = this.mode === 'resize'
      const offsetX = isDragging ? this.offsetX : 0
      const offsetY = isDragging ? this.offsetY : 0
      const resizeOffsetX = isResizing ? this.resizeOffsetX : 0
      const resizeOffsetY = isResizing ? this.resizeOffsetY : 0
      const resizeOffsetW = isResizing ? this.resizeOffsetW : 0
      const resizeOffsetH = isResizing ? this.resizeOffsetH : 0
      const currentX = this.object.x + offsetX + resizeOffsetX
      const currentY = this.object.y + offsetY + resizeOffsetY
      const currentWidth = this.object.width + resizeOffsetW
      const currentHeight = this.object.height + resizeOffsetH
      return {
        left: `${currentX * scale}px`,
        top: `${currentY * scale}px`,
        width: `${currentWidth * scale}px`,
        height: `${currentHeight * scale}px`,
        pointerEvents: this.readOnly ? 'none' : 'auto',
      }
    },
    toolbarStyle() {
      const scale = this.pagesScale || 1
      const isDragging = this.mode === 'drag'
      const isResizing = this.mode === 'resize'
      const offsetX = isDragging ? this.offsetX : 0
      const offsetY = isDragging ? this.offsetY : 0
      const resizeOffsetX = isResizing ? this.resizeOffsetX : 0
      const resizeOffsetY = isResizing ? this.resizeOffsetY : 0
      const resizeOffsetW = isResizing ? this.resizeOffsetW : 0
      const x = this.object.x + offsetX + resizeOffsetX
      const y = this.object.y + offsetY + resizeOffsetY
      const width = this.object.width + resizeOffsetW
      const toolbarOffset = 60
      const nextTop = y - toolbarOffset
      const top = nextTop < 0 ? (y + 8) : nextTop
      return {
        left: `${(x + width / 2) * scale}px`,
        top: `${top * scale}px`,
        transform: 'translateX(-50%)',
      }
    },
    dragElementStyle() {
      if (!this.isBeingDraggedGlobally || !this.draggingClientPos) {
        return {}
      }
      return {
        opacity: 0,
        pointerEvents: 'none',
      }
    },
  },
  mounted() {
    this.handleClickOutside = this.handleClickOutside.bind(this)
    this.boundHandleMove = this.handleMove.bind(this)
    this.boundStopInteraction = this.stopInteraction.bind(this)
    document.addEventListener('mousedown', this.handleClickOutside)
    document.addEventListener('touchstart', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside)
    document.removeEventListener('touchstart', this.handleClickOutside)
    window.removeEventListener('mousemove', this.boundHandleMove)
    window.removeEventListener('mouseup', this.boundStopInteraction)
    window.removeEventListener('touchmove', this.boundHandleMove)
    window.removeEventListener('touchend', this.boundStopInteraction)
    if (this.rafId) cancelAnimationFrame(this.rafId)
  },
  methods: {
    handleElementClick(event) {
      if (this.readOnly) {
        return
      }
      if (event.target.closest('.delete-handle') || event.target.closest('[data-stop-drag]') || event.target.closest('.actions-toolbar')) {
        return
      }
      event.preventDefault()
      this.isSelected = true
      this.startDrag(event)
    },
    handleClickOutside(event) {
      if (this.$el && !this.$el.contains(event.target)) {
        this.isSelected = false
      }
    },
    startResizeFromSlot(direction, event) {
      if (!direction || !event) return
      this.startResize(direction, event)
    },
    startDrag(event) {
      if (this.readOnly) return
      if (event.target.classList.contains('delete')) return
      if (event.target.classList.contains('resize-handle')) return
      this.mode = 'drag'
      this.startX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX
      this.startY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
      this.startLeft = this.object.x
      this.startTop = this.object.y
      this.offsetX = 0
      this.offsetY = 0
      this.resetResizeOffsets()

      const elementRect = this.$el.querySelector('.draggable-element').getBoundingClientRect()

      this.pointerOffsetDoc.x = this.startX - elementRect.left
      this.pointerOffsetDoc.y = this.startY - elementRect.top

      const pageRect = this.capturePageRect()
      this.currentPageRect = pageRect
      let dragElementShift = { x: 0, y: 0 }
      if (pageRect) {
        const expectedLeft = pageRect.left + (this.object.x * this.pagesScale)
        const expectedTop = pageRect.top + (this.object.y * this.pagesScale)
        dragElementShift = {
          x: elementRect.left - expectedLeft,
          y: elementRect.top - expectedTop,
        }
      }

      this.onDragStart(this.startX, this.startY, { ...this.pointerOffsetDoc }, dragElementShift)

      window.addEventListener('mousemove', this.boundHandleMove)
      window.addEventListener('mouseup', this.boundStopInteraction)
      window.addEventListener('touchmove', this.boundHandleMove)
      window.addEventListener('touchend', this.boundStopInteraction)
    },
    startResize(direction, event) {
      if (this.readOnly) return
      this.mode = 'resize'
      this.direction = direction
      this.startX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX
      this.startY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
      this.startLeft = this.object.x
      this.startTop = this.object.y
      this.startWidth = this.object.width
      this.startHeight = this.object.height
      this.aspectRatio = this.startWidth / this.startHeight
      this.offsetX = 0
      this.offsetY = 0
      this.resetResizeOffsets()

      window.addEventListener('mousemove', this.boundHandleMove)
      window.addEventListener('mouseup', this.boundStopInteraction)
      window.addEventListener('touchmove', this.boundHandleMove)
      window.addEventListener('touchend', this.boundStopInteraction)
    },
    handleMove(event) {
      if (this.mode === 'idle') return
      event.preventDefault()

      if (this.rafId) return

      this.rafId = requestAnimationFrame(() => {
        const currentX = event.type.includes('touch') ? event.touches[0]?.clientX : event.clientX
        const currentY = event.type.includes('touch') ? event.touches[0]?.clientY : event.clientY

        if (currentX === undefined || currentY === undefined) return

        this.lastMouseX = currentX
        this.lastMouseY = currentY
        const deltaX = (currentX - this.startX) / this.pagesScale
        const deltaY = (currentY - this.startY) / this.pagesScale

        if (this.mode === 'drag') {
          const pageRect = this.currentPageRect
          if (pageRect) {
            const newElementLeft = currentX - this.pointerOffsetDoc.x
            const newElementTop = currentY - this.pointerOffsetDoc.y

            const newX = (newElementLeft - pageRect.left) / this.pagesScale
            const newY = (newElementTop - pageRect.top) / this.pagesScale

            this.offsetX = newX - this.object.x
            this.offsetY = newY - this.object.y
          } else {
            this.offsetX = deltaX
            this.offsetY = deltaY
          }
          this.onDragMove(currentX, currentY)
          if (this.isBeingDraggedGlobally) {
            this.onUpdate({
              _globalDrag: true,
              _mouseX: currentX,
              _mouseY: currentY,
            })
          }
          this.rafId = null
          return
        }

        const minSize = 16 / (this.pagesScale || 1)
        let newWidth = this.startWidth
        let newHeight = this.startHeight
        let newLeft = this.startLeft
        let newTop = this.startTop

        const widthChange = this.direction.includes('right') ? deltaX : this.direction.includes('left') ? -deltaX : 0
        newWidth = this.startWidth + widthChange
        if (newWidth < minSize) newWidth = minSize
        newHeight = newWidth / this.aspectRatio

        if (this.direction.includes('left')) {
          newLeft = this.startLeft + (this.startWidth - newWidth)
          if (newLeft < 0) {
            const overflow = -newLeft
            newLeft = 0
            newWidth = newWidth - overflow
            newHeight = newWidth / this.aspectRatio
          }
        }

        if (this.direction.includes('top')) {
          newTop = this.startTop + (this.startHeight - newHeight)
          if (newTop < 0) {
            const overflow = -newTop
            newTop = 0
            newHeight = newHeight - overflow
            newWidth = newHeight * this.aspectRatio
            if (this.direction.includes('left')) {
              newLeft = this.startLeft + (this.startWidth - newWidth)
            }
          }
        }

        if (newLeft + newWidth > this.pageWidth) {
          const excess = newLeft + newWidth - this.pageWidth
          newWidth -= excess
          newHeight = newWidth / this.aspectRatio
        }
        if (newTop + newHeight > this.pageHeight) {
          const excess = newTop + newHeight - this.pageHeight
          newHeight -= excess
          newWidth = newHeight * this.aspectRatio
          if (this.direction.includes('left')) {
            newLeft = this.startLeft + (this.startWidth - newWidth)
          }
        }

        this.resizeOffsetX = newLeft - this.object.x
        this.resizeOffsetY = newTop - this.object.y
        this.resizeOffsetW = newWidth - this.object.width
        this.resizeOffsetH = newHeight - this.object.height

        this.rafId = null
      })
    },
    stopInteraction() {
      if (this.mode === 'idle') return

      if (this.mode === 'drag' && (this.offsetX !== 0 || this.offsetY !== 0)) {
        if (this.isBeingDraggedGlobally) {
          this.onUpdate({
            _globalDrag: true,
            _mouseX: this.lastMouseX,
            _mouseY: this.lastMouseY,
          })
        } else {
          const x = Math.max(0, Math.min(this.object.x + this.offsetX, this.pageWidth - this.object.width))
          const y = Math.max(0, Math.min(this.object.y + this.offsetY, this.pageHeight - this.object.height))
          this.onUpdate({ x, y })
        }
      }

      if (this.mode === 'resize' && (this.resizeOffsetW !== 0 || this.resizeOffsetH !== 0 || this.resizeOffsetX !== 0 || this.resizeOffsetY !== 0)) {
        const x = this.object.x + this.resizeOffsetX
        const y = this.object.y + this.resizeOffsetY
        const width = this.object.width + this.resizeOffsetW
        const height = this.object.height + this.resizeOffsetH
        this.onUpdate({ x, y, width, height })
      }

      this.resetOffsets()
      this.onDragEnd()
      window.removeEventListener('mousemove', this.boundHandleMove)
      window.removeEventListener('mouseup', this.boundStopInteraction)
      window.removeEventListener('touchmove', this.boundHandleMove)
      window.removeEventListener('touchend', this.boundStopInteraction)
    },
    capturePageRect() {
      const wrapper = this.$el.closest('.page-wrapper')
      if (!wrapper) return null
      const canvas = wrapper.querySelector('canvas')
      return canvas ? canvas.getBoundingClientRect() : null
    },
    resetResizeOffsets() {
      this.resizeOffsetX = 0
      this.resizeOffsetY = 0
      this.resizeOffsetW = 0
      this.resizeOffsetH = 0
    },
    resetOffsets() {
      this.mode = 'idle'
      this.offsetX = 0
      this.offsetY = 0
      this.resetResizeOffsets()
      this.pointerOffsetDoc = { x: 0, y: 0 }
      this.currentPageRect = null
    },
  },
}
</script>

<style scoped>
.draggable-wrapper {
  position: relative;
}
.actions-toolbar {
  position: absolute;
  display: flex;
  gap: 4px;
  background: #1f2937;
  border-radius: 6px;
  padding: 6px 8px;
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.15), 0 2px 6px -2px rgba(0, 0, 0, 0.1);
  z-index: 5;
  white-space: nowrap;
}
.action-btn {
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
.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.draggable-element {
  position: absolute;
  cursor: move;
  user-select: none;
  border-radius: 6px;
  overflow: visible;
}
.draggable-element.selected {
  box-shadow: inset 0 0 0 2px #2563eb;
}
.resize-handle {
  all: unset;
  position: absolute;
  width: 12px;
  height: 12px;
  min-width: 0;
  min-height: 0;
  background: #2563eb;
  border: 1px solid #ffffff;
  border-radius: 3px;
  padding: 0;
  margin: 0;
  line-height: 0;
  font-size: 0;
  box-sizing: border-box;
  display: block;
  appearance: none;
  cursor: pointer;
  z-index: 5;
}
.handle-top-left {
  top: -7px;
  left: -7px;
  cursor: nwse-resize;
}
.handle-top-right {
  top: -7px;
  right: -7px;
  cursor: nesw-resize;
}
.handle-bottom-left {
  bottom: -7px;
  left: -7px;
  cursor: nesw-resize;
}
.handle-bottom-right {
  bottom: -7px;
  right: -7px;
  cursor: nwse-resize;
}
</style>
