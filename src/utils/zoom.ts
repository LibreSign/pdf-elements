// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { PDFDocumentEntry } from '../types'

export function applyScaleToDocs(docs: PDFDocumentEntry[], scale: number) {
  docs.forEach((doc) => {
    doc.pagesScale = doc.pagesScale.map(() => scale)
  })
}
