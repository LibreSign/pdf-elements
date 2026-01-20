// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import PDFElements from './components/PDFElements.vue'
export { setWorkerPath } from './utils/asyncReader.js'

PDFElements.install = function(Vue) {
  if (PDFElements.install.installed) return
  Vue.component(PDFElements.name, PDFElements)
}

if (typeof window !== 'undefined' && window.Vue) {
  PDFElements.install(window.Vue)
}

export default PDFElements
export { PDFElements }
