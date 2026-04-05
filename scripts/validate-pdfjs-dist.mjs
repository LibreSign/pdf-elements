// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

function findRuntimeChunk(files) {
  return files.find((fileName) => /^pdf-(?!worker)(.+)\.mjs$/.test(fileName)) ?? null
}

function findWorkerChunk(files) {
  return files.find((fileName) => /^pdf\.worker\.min-.+\.mjs$/.test(fileName)) ?? null
}

export function extractRuntimeVersion(runtimeSource) {
  const match = runtimeSource.match(/apiVersion:\s*"([^"]+)"/)
  return match?.[1] ?? null
}

export function extractWorkerVersion(workerModuleSource) {
  const dataUrlMatch = workerModuleSource.match(/data:text\/javascript;base64,([^"']+)/)
  const decodedSource = dataUrlMatch
    ? Buffer.from(dataUrlMatch[1], 'base64').toString('utf8')
    : workerModuleSource

  const explicitVersion = decodedSource.match(/workerVersion\s*[:=]\s*"([^"]+)"/)
  if (explicitVersion?.[1]) {
    return explicitVersion[1]
  }

  const firstSemver = decodedSource.match(/\b\d+\.\d+\.\d+\b/)
  return firstSemver?.[0] ?? null
}

export async function validatePdfjsDist({ rootDir } = {}) {
  const packageRoot = rootDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = path.join(packageRoot, 'dist')
  const packageLockPath = path.join(packageRoot, 'package-lock.json')

  const files = await readdir(distDir)
  const runtimeChunk = findRuntimeChunk(files)
  const workerChunk = findWorkerChunk(files)

  if (!runtimeChunk) {
    throw new Error('Unable to find the bundled PDF runtime chunk in dist/.')
  }

  if (!workerChunk) {
    throw new Error('Unable to find the bundled PDF worker chunk in dist/.')
  }

  const [runtimeSource, workerModuleSource, packageLockSource] = await Promise.all([
    readFile(path.join(distDir, runtimeChunk), 'utf8'),
    readFile(path.join(distDir, workerChunk), 'utf8'),
    readFile(packageLockPath, 'utf8'),
  ])

  const runtimeVersion = extractRuntimeVersion(runtimeSource)
  const workerVersion = extractWorkerVersion(workerModuleSource)
  const packageLock = JSON.parse(packageLockSource)
  const resolvedPdfjsVersion = packageLock.packages?.['node_modules/pdfjs-dist']?.version ?? null

  if (!runtimeVersion) {
    throw new Error(`Unable to extract the PDF.js runtime version from ${runtimeChunk}.`)
  }

  if (!workerVersion) {
    throw new Error(`Unable to extract the PDF.js worker version from ${workerChunk}.`)
  }

  if (!resolvedPdfjsVersion) {
    throw new Error('Unable to resolve pdfjs-dist version from package-lock.json.')
  }

  if (runtimeVersion !== workerVersion) {
    throw new Error(
      `PDF.js dist mismatch: runtime chunk ${runtimeChunk} uses ${runtimeVersion}, worker chunk ${workerChunk} uses ${workerVersion}.`
    )
  }

  if (runtimeVersion !== resolvedPdfjsVersion) {
    throw new Error(
      `PDF.js dist drift: runtime chunk ${runtimeChunk} uses ${runtimeVersion}, but package-lock.json resolves pdfjs-dist ${resolvedPdfjsVersion}.`
    )
  }

  return {
    runtimeChunk,
    workerChunk,
    runtimeVersion,
    workerVersion,
    resolvedPdfjsVersion,
  }
}

async function main() {
  const result = await validatePdfjsDist()
  console.log(
    `Validated PDF.js dist chunks: runtime ${result.runtimeChunk} and worker ${result.workerChunk} both use ${result.runtimeVersion}.`
  )
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null

if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}