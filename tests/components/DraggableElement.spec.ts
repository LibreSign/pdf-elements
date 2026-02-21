// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DraggableElement from '../../src/components/DraggableElement.vue'

const baseObject = { id: 'a', x: 10, y: 10, width: 20, height: 20 }

const mountElement = (props = {}) => {
  return mount(DraggableElement, {
    props: {
      object: baseObject,
      pageWidth: 100,
      pageHeight: 100,
      ...props,
    },
  })
}

describe('DraggableElement business rules', () => {
  it('does not select when readOnly', async () => {
    const wrapper = mountElement({ readOnly: true })
    await wrapper.find('.draggable-element').trigger('mousedown', {
      clientX: 5,
      clientY: 5,
    })
    expect(wrapper.vm.isSelected).toBe(false)
  })

  it('selects element and notifies drag start', async () => {
    const onDragStart = vi.fn()
    const wrapper = mountElement({ onDragStart })
    const element = wrapper.find('.draggable-element').element as HTMLElement
    element.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 20,
      bottom: 20,
      width: 20,
      height: 20,
      toJSON: () => ({}),
    })

    await wrapper.find('.draggable-element').trigger('mousedown', {
      clientX: 12,
      clientY: 14,
    })

    expect(wrapper.vm.isSelected).toBe(true)
    expect(onDragStart).toHaveBeenCalled()
    const args = onDragStart.mock.calls[0]
    expect(args[0]).toBe(12)
    expect(args[1]).toBe(14)
    expect(args[2]).toEqual({ x: 12, y: 14 })
    expect(args[3]).toEqual({ x: 0, y: 0 })
  })

  it('ignores click on action toolbar', () => {
    const wrapper = mountElement()
    const toolbar = document.createElement('div')
    toolbar.className = 'actions-toolbar'

    wrapper.vm.handleElementClick({
      preventDefault: () => {},
      target: toolbar,
    })

    expect(wrapper.vm.isSelected).toBe(false)
  })

  it('clamps drag updates within page bounds', () => {
    const onUpdate = vi.fn()
    const wrapper = mountElement({
      object: { id: 'a', x: 70, y: 70, width: 40, height: 40 },
      onUpdate,
    })

    wrapper.vm.mode = 'drag'
    wrapper.vm.offsetX = 20
    wrapper.vm.offsetY = 10

    wrapper.vm.stopInteraction()

    expect(onUpdate).toHaveBeenCalledWith({ x: 60, y: 60 })
  })

  it('emits global drag update on stop when dragging globally', () => {
    const onUpdate = vi.fn()
    const wrapper = mountElement({ onUpdate, isBeingDraggedGlobally: true })

    wrapper.vm.mode = 'drag'
    wrapper.vm.offsetX = 5
    wrapper.vm.offsetY = 5
    wrapper.vm.lastMouseX = 120
    wrapper.vm.lastMouseY = 140

    wrapper.vm.stopInteraction()

    expect(onUpdate).toHaveBeenCalledWith({
      _globalDrag: true,
      _mouseX: 120,
      _mouseY: 140,
    })
  })

  it('calls onDragMove while dragging', () => {
    const onDragMove = vi.fn()
    const wrapper = mountElement({ onDragMove })
    wrapper.vm.mode = 'drag'
    wrapper.vm.startX = 0
    wrapper.vm.startY = 0

    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    wrapper.vm.handleMove({
      type: 'mousemove',
      clientX: 10,
      clientY: 20,
      preventDefault: () => {},
    })

    expect(onDragMove).toHaveBeenCalledWith(10, 20)

    rafSpy.mockRestore()
  })

  it('applies resize updates', () => {
    const onUpdate = vi.fn()
    const wrapper = mountElement({ onUpdate })

    wrapper.vm.mode = 'resize'
    wrapper.vm.resizeOffsetX = -10
    wrapper.vm.resizeOffsetY = -10
    wrapper.vm.resizeOffsetW = 5
    wrapper.vm.resizeOffsetH = 5

    wrapper.vm.stopInteraction()

    expect(onUpdate).toHaveBeenCalledWith({ x: 0, y: 0, width: 25, height: 25 })
  })

  it('does not emit update when idle', () => {
    const onUpdate = vi.fn()
    const wrapper = mountElement({ onUpdate })

    wrapper.vm.mode = 'idle'
    wrapper.vm.stopInteraction()

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('resets offsets after interaction', () => {
    const wrapper = mountElement()
    wrapper.vm.mode = 'drag'
    wrapper.vm.offsetX = 5
    wrapper.vm.offsetY = 6

    wrapper.vm.stopInteraction()

    expect(wrapper.vm.mode).toBe('idle')
    expect(wrapper.vm.offsetX).toBe(0)
    expect(wrapper.vm.offsetY).toBe(0)
  })

  it('always calls onDragEnd when stopping interaction', () => {
    const onDragEnd = vi.fn()
    const wrapper = mountElement({ onDragEnd })
    wrapper.vm.mode = 'drag'
    wrapper.vm.offsetX = 1
    wrapper.vm.offsetY = 2

    wrapper.vm.stopInteraction()

    expect(onDragEnd).toHaveBeenCalled()
  })

  it('deselects on outside click unless ignored', () => {
    const wrapper = mountElement()
    wrapper.vm.isSelected = true

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    wrapper.vm.handleClickOutside({ target: outside })

    expect(wrapper.vm.isSelected).toBe(false)

    const wrapperIgnored = mountElement({ ignoreClickOutsideSelectors: ['.keep-selected'] })
    wrapperIgnored.vm.isSelected = true
    const keep = document.createElement('div')
    keep.className = 'keep-selected'
    document.body.appendChild(keep)

    wrapperIgnored.vm.handleClickOutside({ target: keep })
    expect(wrapperIgnored.vm.isSelected).toBe(true)

    keep.remove()
    outside.remove()
  })

  it('keeps selection on ignored selector via DOM event', async () => {
    const wrapper = mountElement({ ignoreClickOutsideSelectors: ['.keep'] })
    wrapper.vm.isSelected = true

    const keep = document.createElement('div')
    keep.className = 'keep'
    document.body.appendChild(keep)

    keep.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isSelected).toBe(true)

    keep.remove()
  })

  it('keeps resize above minimum size', () => {
    const wrapper = mountElement({
      object: { id: 'a', x: 0, y: 0, width: 30, height: 30 },
      pagesScale: 1,
    })

    wrapper.vm.mode = 'resize'
    wrapper.vm.direction = 'top-left'
    wrapper.vm.startX = 100
    wrapper.vm.startY = 100
    wrapper.vm.startLeft = 0
    wrapper.vm.startTop = 0
    wrapper.vm.startWidth = 30
    wrapper.vm.startHeight = 30
    wrapper.vm.aspectRatio = 1

    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    wrapper.vm.handleMove({
      type: 'mousemove',
      clientX: 200,
      clientY: 200,
      preventDefault: () => {},
    })

    expect(wrapper.vm.resizeOffsetW).toBeGreaterThanOrEqual(-14)
    expect(wrapper.vm.resizeOffsetH).toBeGreaterThanOrEqual(-14)

    rafSpy.mockRestore()
  })

  it('clamps resize within page bounds', () => {
    const wrapper = mountElement({
      object: { id: 'a', x: 60, y: 60, width: 30, height: 30 },
      pagesScale: 1,
      pageWidth: 100,
      pageHeight: 100,
    })

    wrapper.vm.mode = 'resize'
    wrapper.vm.direction = 'bottom-right'
    wrapper.vm.startX = 0
    wrapper.vm.startY = 0
    wrapper.vm.startLeft = 60
    wrapper.vm.startTop = 60
    wrapper.vm.startWidth = 30
    wrapper.vm.startHeight = 30
    wrapper.vm.aspectRatio = 1

    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    wrapper.vm.handleMove({
      type: 'mousemove',
      clientX: 200,
      clientY: 200,
      preventDefault: () => {},
    })

    const newWidth = wrapper.vm.object.width + wrapper.vm.resizeOffsetW
    const newHeight = wrapper.vm.object.height + wrapper.vm.resizeOffsetH

    expect(newWidth).toBeLessThanOrEqual(40)
    expect(newHeight).toBeLessThanOrEqual(40)

    rafSpy.mockRestore()
  })

  it('scales drag delta using pagesScale', () => {
    const wrapper = mountElement({ pagesScale: 2 })
    wrapper.vm.mode = 'drag'
    wrapper.vm.startX = 0
    wrapper.vm.startY = 0

    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    wrapper.vm.handleMove({
      type: 'mousemove',
      clientX: 20,
      clientY: 10,
      preventDefault: () => {},
    })

    expect(wrapper.vm.offsetX).toBe(10)
    expect(wrapper.vm.offsetY).toBe(5)

    rafSpy.mockRestore()
  })

  it('computes drag offsets using page rect with scaling', async () => {
    const onDragStart = vi.fn()
    const wrapper = mountElement({ pagesScale: 2, onDragStart })

    const element = wrapper.find('.draggable-element').element as HTMLElement
    element.getBoundingClientRect = () => ({
      x: 20,
      y: 40,
      left: 20,
      top: 40,
      right: 40,
      bottom: 60,
      width: 20,
      height: 20,
      toJSON: () => ({}),
    })

    const wrapperEl = wrapper.find('.draggable-wrapper').element as HTMLElement
    wrapperEl.closest = () => ({
      querySelector: () => ({
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 200, bottom: 200 }),
      }),
    }) as any

    await wrapper.find('.draggable-element').trigger('mousedown', {
      clientX: 30,
      clientY: 50,
    })

    expect(onDragStart).toHaveBeenCalled()
    expect(wrapper.vm.pointerOffsetDoc).toEqual({ x: 10, y: 10 })
  })

  it('hides toolbar while dragged globally', async () => {
    const wrapper = mountElement({ isBeingDraggedGlobally: true })
    wrapper.vm.isSelected = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.actions-toolbar').exists()).toBe(false)
  })
})
