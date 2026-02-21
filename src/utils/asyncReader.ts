// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { PDFDocumentProxy, PDFWorker } from 'pdfjs-dist'

let sharedWorker: PDFWorker | null = null
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
let workerUrlPromise: Promise<string> | null = null
let workerSrcOverride: string | null = null

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist')
  }
  return pdfjsPromise
}

function loadWorkerUrl() {
  if (!workerUrlPromise) {
    workerUrlPromise = import('pdfjs-dist/build/pdf.worker.min.mjs?url').then(
      (mod) => mod.default as string
    )
  }
  return workerUrlPromise
}

async function ensureWorkerSrc(pdfjs: typeof import('pdfjs-dist')) {
  if (workerSrcOverride) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrcOverride
    return
  }
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = await loadWorkerUrl()
  }
}

async function getSharedWorker(pdfjs: typeof import('pdfjs-dist')): Promise<PDFWorker> {
  if (!sharedWorker) {
    await ensureWorkerSrc(pdfjs)
    sharedWorker = new pdfjs.PDFWorker({}) as PDFWorker
  }
  return sharedWorker
}

export function setWorkerPath(path: string) {
  workerSrcOverride = path
  if (pdfjsPromise) {
    pdfjsPromise.then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = path
    })
  }
}

export function readAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

type PdfInput =
  | string
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | {
      url?: string
      data?: ArrayBuffer | Uint8Array
      [key: string]: unknown
    }

export async function readAsPDF(
  file: PdfInput,
  options: Record<string, unknown> = {}
): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs()
  const worker = await getSharedWorker(pdfjs)
  const isArrayBuffer = file instanceof ArrayBuffer
  const isView = ArrayBuffer.isView(file)
  const isBlob = typeof Blob !== 'undefined' && file instanceof Blob

  if (file && typeof file === 'object' && !isArrayBuffer && !isView && !isBlob) {
    return pdfjs.getDocument({ ...(file as Record<string, unknown>), ...options, worker }).promise
  }
  if (typeof file === 'string') {
    return pdfjs.getDocument({ url: file, ...options, worker }).promise
  }
  if (isBlob) {
    const data = await readAsArrayBuffer(file as Blob)
    return pdfjs.getDocument({ data, ...options, worker }).promise
  }
  const data = isArrayBuffer
    ? (file as ArrayBuffer)
    : new Uint8Array(
        (file as ArrayBufferView).buffer,
        (file as ArrayBufferView).byteOffset,
        (file as ArrayBufferView).byteLength
      )

  return pdfjs.getDocument({ data, ...options, worker }).promise
}
