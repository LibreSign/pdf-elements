// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { generateScreenshot, packageRoot, screenshotPath } from './generate-screenshots.mjs'


const maxDiffRatio = 0.001

const diffPath = path.join(packageRoot, 'test-results', 'demo-screenshot-diff.png')
const currentPath = path.join(packageRoot, 'test-results', 'demo-screenshot-current.png')

async function main() {
  const committed = PNG.sync.read(await readFile(screenshotPath))
  const currentImage = await generateScreenshot()
  const current = PNG.sync.read(currentImage)

  if (committed.width !== current.width || committed.height !== current.height) {
    await mkdir(path.dirname(currentPath), { recursive: true })
    await writeFile(currentPath, currentImage)

    throw new Error(
      `Screenshot size changed: committed ${committed.width}x${committed.height}, ` +
      `generated ${current.width}x${current.height}.\n` +
      `Generated screenshot written to ${path.relative(packageRoot, currentPath)}.\n` +
      'Run "npm run screenshots:update" and commit the result.'
    )
  }

  const {width, height} = committed
  const diff = new PNG({width, height})
  const changedPixels = pixelmatch(committed.data, current.data, diff.data, width, height, {
    threshold: 0.1,
  })

  const totalPixels = width * height
  const ratio = changedPixels / totalPixels
  const report = `${changedPixels} of ${totalPixels} pixels differ (${(ratio * 100).toFixed(4)}%)`

  if (ratio <= maxDiffRatio) {
    globalThis.console.log(`Screenshot is up to date: ${report}.`)
    return
  }

  await mkdir(path.dirname(diffPath), {recursive: true})
  await writeFile(currentPath, currentImage)
  await writeFile(diffPath, PNG.sync.write(diff))

  throw new Error(
    `${report}, above the allowed ${(maxDiffRatio * 100).toFixed(4)}%.\n` +
    `Generated screenshot written to ${path.relative(packageRoot, currentPath)}.\n` +
    `Visual diff written to ${path.relative(packageRoot, diffPath)}.\n` +
    'If the change is expected, run "npm run screenshots:update" and commit the result.'
  )
}

main().catch((error) => {
  globalThis.console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
