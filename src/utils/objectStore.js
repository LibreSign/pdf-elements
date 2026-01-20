// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function objectIdExistsInDoc(doc, objectId) {
  if (!doc || !objectId) return false
  return doc.allObjects.some((objects) => objects.some((obj) => obj.id === objectId))
}

export function findObjectPageIndex(doc, objectId) {
  if (!doc || !objectId) return undefined
  for (let pageIndex = 0; pageIndex < doc.allObjects.length; pageIndex++) {
    if (doc.allObjects[pageIndex].some((obj) => obj.id === objectId)) {
      return pageIndex
    }
  }
  return undefined
}

export function updateObjectInDoc(doc, pageIndex, objectId, payload) {
  const objects = doc?.allObjects?.[pageIndex]
  if (!objects) return false
  const objectIndex = objects.findIndex((obj) => obj.id === objectId)
  if (objectIndex === -1) return false
  objects.splice(objectIndex, 1, { ...objects[objectIndex], ...payload })
  return true
}

export function removeObjectFromDoc(doc, pageIndex, objectId) {
  const objects = doc?.allObjects?.[pageIndex]
  if (!objects) return false
  const objectIndex = objects.findIndex((obj) => obj.id === objectId)
  if (objectIndex === -1) return false
  objects.splice(objectIndex, 1)
  return true
}
