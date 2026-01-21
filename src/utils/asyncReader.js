// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getDocument, GlobalWorkerOptions, PDFWorker } from 'pdfjs-dist'
import pdfWorkerCode from 'pdfjs-dist/build/pdf.worker.min.mjs'

GlobalWorkerOptions.workerSrc = pdfWorkerCode

let sharedWorker = null

function getSharedWorker() {
  if (!sharedWorker) {
    sharedWorker = new PDFWorker({ name: 'libresign-pdf-worker' })
  }
  return sharedWorker
}

export function setWorkerPath(path) {
  GlobalWorkerOptions.workerSrc = path
}

export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function readAsPDF(file) {
  const worker = getSharedWorker()
  const isArrayBuffer = file instanceof ArrayBuffer
  const isView = ArrayBuffer.isView(file)
  const isBlob = typeof Blob !== 'undefined' && file instanceof Blob

  if (file && typeof file === 'object' && !isArrayBuffer && !isView && !isBlob) {
    return getDocument({ ...file, worker }).promise
  }
  if (typeof file === 'string') {
    return getDocument({ url: file, worker }).promise
  }
  return getDocument({ data: file, worker }).promise
}
