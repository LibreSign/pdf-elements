// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjs from 'pdfjs-dist'

vi.mock('pdfjs-dist', () => {
  const GlobalWorkerOptions = {
    workerSrc: '/pdf.worker.min.mjs',
  }
  const PDFWorker = class PDFWorker {}
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({}),
  }))
  const mockedModule = {
    GlobalWorkerOptions,
    PDFWorker,
    getDocument,
  }

  return {
    ...mockedModule,
    default: mockedModule,
  }
})

vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url', () => ({
  default: '/pdf.worker.min.mjs',
}))

import { readAsPDF } from '../../src/utils/asyncReader'

describe('readAsPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables eval and PDF scripting by default', async () => {
    await readAsPDF('https://example.com/sample.pdf')

    expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/sample.pdf',
      isEvalSupported: false,
      enableScripting: false,
    }))
  })

  it('does not allow callers to re-enable eval or PDF scripting', async () => {
    await readAsPDF('https://example.com/sample.pdf', {
      isEvalSupported: true,
      enableScripting: true,
    })

    expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({
      isEvalSupported: false,
      enableScripting: false,
    }))
  })

  it('applies the safe defaults when loading binary PDF data', async () => {
    const data = new Uint8Array([1, 2, 3])

    await readAsPDF(data)

    expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.any(Uint8Array),
      isEvalSupported: false,
      enableScripting: false,
    }))
  })
})
