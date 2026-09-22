// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { generateScreenshot, packageRoot, screenshotPath } from './generate-screenshots.mjs'


const maxDiffRatio = 0.001

const resultsDir = path.join(packageRoot, 'test-results')
const diffPath = path.join(resultsDir, 'demo-screenshot-diff.png')
const currentPath = path.join(resultsDir, 'demo-screenshot-current.png')
const expectedPath = path.join(resultsDir, 'demo-screenshot-expected.png')
const reportPath = path.join(resultsDir, 'demo-screenshot-report.json')

async function writeComparisonImages(committedImage, currentImage) {
  await mkdir(resultsDir, { recursive: true })
  await writeFile(expectedPath, committedImage)
  await writeFile(currentPath, currentImage)
}

async function writeReport(report) {
  await mkdir(resultsDir, { recursive: true })
  await writeFile(reportPath, JSON.stringify(report, null, 2))
}

async function main() {
  const committedImage = await readFile(screenshotPath)
  const committed = PNG.sync.read(committedImage)
  const currentImage = await generateScreenshot()
  const current = PNG.sync.read(currentImage)

  if (committed.width !== current.width || committed.height !== current.height) {
    await writeComparisonImages(committedImage, currentImage)
    await writeReport({
      type: 'size',
      committed: { width: committed.width, height: committed.height },
      generated: { width: current.width, height: current.height },
    })

    throw new Error(
      `Screenshot size changed: committed ${committed.width}x${committed.height}, ` +
      `generated ${current.width}x${current.height}.\n` +
      `Expected screenshot written to ${path.relative(packageRoot, expectedPath)}.\n` +
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

  await writeComparisonImages(committedImage, currentImage)
  await writeFile(diffPath, PNG.sync.write(diff))
  await writeReport({
    type: 'pixels',
    changedPixels,
    totalPixels,
    ratio,
    maxDiffRatio,
  })

  throw new Error(
    `${report}, above the allowed ${(maxDiffRatio * 100).toFixed(4)}%.\n` +
    `Expected screenshot written to ${path.relative(packageRoot, expectedPath)}.\n` +
    `Generated screenshot written to ${path.relative(packageRoot, currentPath)}.\n` +
    `Visual diff written to ${path.relative(packageRoot, diffPath)}.\n` +
    'If the change is expected, run "npm run screenshots:update" and commit the result.'
  )
}

main().catch((error) => {
  globalThis.console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
