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

    wrapper.vm.renderTask = { cancel }

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
    wrapper.vm.renderTask = { cancel }
    wrapper.unmount()

    expect(cancel).toHaveBeenCalled()
  })
})
