// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { App } from 'vue'
import PDFElements from './components/PDFElements.vue'

export { setWorkerPath } from './utils/asyncReader'
export type { PDFDocumentEntry, PDFElementObject, PDFElementsPublicApi } from './types'

const install = (app: App) => {
  const name = PDFElements.name || 'PDFElements'
  app.component(name, PDFElements)
}

;(PDFElements as { install?: (app: App) => void }).install = install

export default PDFElements
export { PDFElements }
