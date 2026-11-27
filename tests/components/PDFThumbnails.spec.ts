// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PDFThumbnails from '../../src/components/PDFThumbnails.vue'

const documents = [{
  name: 'doc',
  file: null,
  pdfDoc: null,
  numPages: 2,
  pages: [Promise.resolve(), Promise.resolve()],
  pageWidths: [100, 200],
  pagesScale: [1, 1],
  allObjects: [[], []],
}]

const mountThumbnails = (props = {}) => mount(PDFThumbnails, {
  props: { documents, width: 100, ...props },
  global: { stubs: { PDFPage: true } },
})

describe('PDFThumbnails', () => {
  it('renders one thumbnail per page and scales to the configured width', () => {
    const wrapper = mountThumbnails()
    const items = wrapper.findAll('.pdf-thumbnail')
    expect(items).toHaveLength(2)
    const pages = wrapper.findAllComponents({ name: 'PDFPage' })
    expect(pages[0].props('scale')).toBe(1)
    expect(pages[1].props('scale')).toBe(0.5)
  })

  it('marks the current page and emits select on click', async () => {
    const wrapper = mountThumbnails({ currentPage: { docIndex: 0, pageIndex: 1 } })
    const items = wrapper.findAll('.pdf-thumbnail')
    expect(items[0].attributes('aria-current')).toBeUndefined()
    expect(items[1].attributes('aria-current')).toBe('page')
    await items[0].trigger('click')
    expect(wrapper.emitted('select')).toEqual([[{ docIndex: 0, pageIndex: 0 }]])
  })

  it('scrolls the active thumbnail into view when the current page changes', async () => {
    const wrapper = mountThumbnails({ currentPage: { docIndex: 0, pageIndex: 0 } })
    const target = wrapper.findAll('.pdf-thumbnail')[1].element as HTMLElement
    target.scrollIntoView = vi.fn()
    await wrapper.setProps({ currentPage: { docIndex: 0, pageIndex: 1 } })
    await wrapper.vm.$nextTick()
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('resets thumbnails when the documents change', async () => {
    const wrapper = mountThumbnails()
    const before = wrapper.findAll('.pdf-thumbnail')[0].element
    await wrapper.setProps({ documents: [{ ...documents[0], pages: [Promise.resolve()], pageWidths: [100] }] })
    expect(wrapper.findAll('.pdf-thumbnail')).toHaveLength(1)
    expect(wrapper.findAll('.pdf-thumbnail')[0].element).not.toBe(before)
  })
})
