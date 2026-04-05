// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface PDFElementObject {
  id?: string
  x: number
  y: number
  width: number
  height: number
  type?: string
  label?: string
  icon?: string
  resizable?: boolean
  [key: string]: unknown
}

export type PDFElementsAddingEndedReason = 'placed' | 'cancelled'

export interface PDFElementsAddingEndedPlacedPayload {
  reason: 'placed'
  object: PDFElementObject
  docIndex: number
  pageIndex: number
}

export interface PDFElementsAddingEndedCancelledPayload {
  reason: 'cancelled'
}

export type PDFElementsAddingEndedPayload =
  | PDFElementsAddingEndedPlacedPayload
  | PDFElementsAddingEndedCancelledPayload

export interface PDFDocumentEntry {
  name: string
  file: unknown
  pdfDoc: unknown
  numPages: number
  pages: Promise<unknown>[]
  pageWidths: number[]
  pagesScale: number[]
  allObjects: PDFElementObject[][]
}

export interface PDFElementsPublicApi {
  startAddingElement: (templateObject: PDFElementObject) => void
  addObjectToPage: (object: PDFElementObject, pageIndex?: number, docIndex?: number) => boolean
  getAllObjects: (docIndex?: number) => PDFElementObject[]
  updateObject: (docIndex: number, objectId: string, payload: Partial<PDFElementObject>) => void
  deleteObject: (docIndex: number, objectId: string) => void
  duplicateObject: (docIndex: number, objectId: string) => void
  cancelAdding: () => void
}
