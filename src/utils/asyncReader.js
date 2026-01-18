// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerCode from 'pdfjs-dist/build/pdf.worker.min.mjs'

GlobalWorkerOptions.workerSrc = pdfWorkerCode

export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function readAsPDF(file) {
  return getDocument(file).promise
}
