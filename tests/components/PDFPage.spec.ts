// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PDFPage from '../../src/components/PDFPage.vue'

const makePage = () => {
  return {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 200 * scale,
    }),
    render: vi.fn(() => ({
      promise: Promise.resolve(),
      cancel: vi.fn(),
    })),
  }
}

describe('PDFPage business rules', () => {
  it('renders canvas and emits measurement', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const page = makePage()
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(page),
        scale: 2,
      },
    })

    await flushPromises()

    const canvas = wrapper.find('canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(400)
    expect(wrapper.emitted('onMeasure')?.[0][0]).toEqual({ scale: 2 })
  })

  it('reserves the page size and reports geometry before the render task finishes', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const page = makePage()
    page.render = vi.fn(() => ({ promise: new Promise<void>(() => {}), cancel: vi.fn() }))
    const wrapper = mount(PDFPage, { props: { page: Promise.resolve(page), scale: 2 } })

    await flushPromises()

    const canvas = wrapper.find('canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(400)
    expect(wrapper.emitted('onGeometry')?.[0][0]).toEqual({ scale: 2 })
    expect(wrapper.emitted('onMeasure')).toBeUndefined()
  })

  it('reserves the new size when the scale changes', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const wrapper = mount(PDFPage, { props: { page: Promise.resolve(makePage()), scale: 1 } })
    await flushPromises()
    await wrapper.setProps({ scale: 3 })
    await flushPromises()

    const canvas = wrapper.find('canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(300)
    const geometry = wrapper.emitted('onGeometry') || []
    expect(geometry[geometry.length - 1][0]).toEqual({ scale: 3 })
  })

  it('reports current canvas measurement', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const page = makePage()
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(page),
        scale: 1,
      },
    })

    await flushPromises()

    const measurement = wrapper.vm.getCanvasMeasurement()
    expect(measurement).toEqual({ canvasWidth: 100, canvasHeight: 200 })
  })

  it('re-renders when scale changes', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const page = makePage()
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(page),
        scale: 1,
      },
    })

    const renderSpy = vi.spyOn(wrapper.vm, 'render')
    renderSpy.mockClear()

    await wrapper.setProps({ scale: 1.5 })

    expect(renderSpy).toHaveBeenCalled()
  })

  it('sets pending render when already rendering', async () => {
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(makePage()),
      },
    })

    wrapper.vm.isRendering = true
    await wrapper.vm.render()

    expect(wrapper.vm.pendingRender).toBe(true)
  })

  it('executes a follow-up render when pending', async () => {
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(makePage()),
      },
    })

    wrapper.vm.isRendering = true
    wrapper.vm.pendingRender = true

    const renderSpy = vi.spyOn(wrapper.vm, 'render')
    renderSpy.mockClear()

    wrapper.vm.isRendering = false
    wrapper.vm.pendingRender = true
    await wrapper.vm.render()

    expect(renderSpy).toHaveBeenCalled()
  })

  it('cancels previous render task before starting a new one', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const page = makePage()
    const cancel = vi.fn()
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(page),
      },
    })

    wrapper.vm.renderTask = { cancel, promise: Promise.resolve() }

    await wrapper.vm.render()

    expect(cancel).toHaveBeenCalled()
  })

  it('cancels pending render task on unmount', () => {
    const wrapper = mount(PDFPage, {
      props: {
        page: Promise.resolve(makePage()),
      },
    })

    const cancel = vi.fn()
    wrapper.vm.renderTask = { cancel, promise: Promise.resolve() }
    wrapper.unmount()

    expect(cancel).toHaveBeenCalled()
  })

  it('cancels a render in flight when the page size changes', async () => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({}))
    const cancel = vi.fn()
    const page = makePage()
    page.render = vi.fn(() => ({ promise: new Promise<void>(() => {}), cancel }))
    const wrapper = mount(PDFPage, { props: { page: Promise.resolve(page), scale: 1 } })
    await flushPromises()
    expect(cancel).not.toHaveBeenCalled()
    await wrapper.setProps({ scale: 2 })
    await flushPromises()
    expect(cancel).toHaveBeenCalled()
  })
})
