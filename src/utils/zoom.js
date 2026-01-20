// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function applyScaleToDocs(docs, scale) {
  docs.forEach((doc) => {
    doc.pagesScale = doc.pagesScale.map(() => scale)
  })
}
