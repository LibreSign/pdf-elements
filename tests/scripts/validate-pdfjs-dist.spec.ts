// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, it } from 'vitest'

import {
  extractRuntimeVersion,
  extractWorkerVersion,
  validatePdfjsDist,
} from '../../scripts/validate-pdfjs-dist.mjs'

const tempDirs: string[] = []

async function createFixtureRoot({ runtimeVersion, workerVersion, lockVersion }: {
  runtimeVersion: string
  workerVersion: string
  lockVersion: string
}) {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'pdf-elements-dist-'))
  tempDirs.push(rootDir)

  const distDir = path.join(rootDir, 'dist')
  await mkdir(distDir, { recursive: true })

  await writeFile(
    path.join(distDir, 'pdf-fixture.mjs'),
    `const runtime = { apiVersion: "${runtimeVersion}" }\nexport default runtime\n`,
    'utf8'
  )

  const encodedWorker = Buffer.from(`const workerVersion = "${workerVersion}"\n`, 'utf8').toString('base64')
  await writeFile(
    path.join(distDir, 'pdf.worker.min-fixture.mjs'),
    `var worker = "data:text/javascript;base64,${encodedWorker}"\nexport { worker as default }\n`,
    'utf8'
  )

  await writeFile(
    path.join(rootDir, 'package-lock.json'),
    JSON.stringify({
      packages: {
        'node_modules/pdfjs-dist': {
          version: lockVersion,
        },
      },
    }),
    'utf8'
  )

  return rootDir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dirPath) => rm(dirPath, { recursive: true, force: true })))
})

describe('validate-pdfjs-dist', () => {
  it('extracts the runtime apiVersion from the bundled PDF chunk', () => {
    expect(extractRuntimeVersion('const runtime = { apiVersion: "5.4.624" }')).toBe('5.4.624')
  })

  it('extracts the worker version from the emitted data URL wrapper', () => {
    const encodedWorker = Buffer.from('const workerVersion = "5.4.624"', 'utf8').toString('base64')

    expect(extractWorkerVersion(`var worker = "data:text/javascript;base64,${encodedWorker}"`)).toBe('5.4.624')
  })

  it('accepts a dist tree whose runtime, worker and lockfile stay aligned', async () => {
    const rootDir = await createFixtureRoot({
      runtimeVersion: '5.4.624',
      workerVersion: '5.4.624',
      lockVersion: '5.4.624',
    })

    await expect(validatePdfjsDist({ rootDir })).resolves.toMatchObject({
      runtimeVersion: '5.4.624',
      workerVersion: '5.4.624',
      resolvedPdfjsVersion: '5.4.624',
    })
  })

  it('rejects a dist tree when the worker version drifts from the runtime version', async () => {
    const rootDir = await createFixtureRoot({
      runtimeVersion: '5.6.205',
      workerVersion: '5.5.207',
      lockVersion: '5.5.207',
    })

    await expect(validatePdfjsDist({ rootDir })).rejects.toThrow(/PDF\.js dist mismatch/)
  })

  it('rejects a dist tree when the runtime version drifts from the lockfile', async () => {
    const rootDir = await createFixtureRoot({
      runtimeVersion: '5.6.205',
      workerVersion: '5.6.205',
      lockVersion: '5.5.207',
    })

    await expect(validatePdfjsDist({ rootDir })).rejects.toThrow(/PDF\.js dist drift/)
  })
})