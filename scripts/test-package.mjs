// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npmExecPath = process.env.npm_execpath

if (!npmExecPath) {
  throw new Error('Run this check through npm so the active npm executable can be reused.')
}

async function runNpm(args, cwd) {
  return execFileAsync(process.execPath, [npmExecPath, ...args], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  })
}

function exportTargets(exports) {
  if (typeof exports === 'string') {
    return [exports]
  }
  if (!exports || typeof exports !== 'object') {
    return []
  }
  return Object.values(exports).flatMap(exportTargets)
}

const tempRoot = await mkdtemp(path.join(tmpdir(), 'pdf-elements-package-'))

try {
  const packDir = path.join(tempRoot, 'pack')
  const consumerDir = path.join(tempRoot, 'consumer')
  await Promise.all([mkdir(packDir), mkdir(consumerDir)])

  // Run prepack while keeping lifecycle output out of npm's JSON response.
  const { stdout } = await runNpm(
    ['pack', '--json', '--foreground-scripts=false', '--pack-destination', packDir],
    packageRoot
  )
  const [packResult] = JSON.parse(stdout)
  assert(packResult?.filename, 'npm pack did not report a tarball filename')

  const packedFiles = new Set(packResult.files.map(({ path: filePath }) => filePath))
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'))
  const requiredFiles = ['COPYING', 'README.md', 'dist/index.css', 'dist/index.mjs', packageJson.types]

  for (const target of exportTargets(packageJson.exports)) {
    assert(target.startsWith('./'), `Package export must be relative: ${target}`)
    requiredFiles.push(target.slice(2))
  }

  for (const filePath of new Set(requiredFiles)) {
    assert(packedFiles.has(filePath), `Packed package is missing ${filePath}`)
  }

  await writeFile(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({ name: 'pdf-elements-smoke-consumer', private: true, type: 'module' }),
    'utf8'
  )

  const tarballPath = path.join(packDir, packResult.filename)
  await runNpm(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', tarballPath],
    consumerDir
  )

  await writeFile(
    path.join(consumerDir, 'verify.mjs'),
    `import assert from 'node:assert/strict'
import PDFElements, { ensureWorkerReady } from '@libresign/pdf-elements'

assert(PDFElements, 'The public entry point has no default export')
assert.equal(typeof ensureWorkerReady, 'function')

for (const specifier of ${JSON.stringify(Object.keys(packageJson.exports))}) {
  const publicSpecifier = specifier === '.'
    ? '@libresign/pdf-elements'
    : \`@libresign/pdf-elements/\${specifier.slice(2)}\`
  assert(import.meta.resolve(publicSpecifier), \`Unable to resolve \${publicSpecifier}\`)
}
`,
    'utf8'
  )

  await execFileAsync(process.execPath, ['verify.mjs'], { cwd: consumerDir })

  await writeFile(
    path.join(consumerDir, 'index.ts'),
    `import PDFElements, {
  ensureWorkerReady,
  type PDFDocumentEntry,
} from '@libresign/pdf-elements'

const component = PDFElements
const prepareWorker: () => Promise<void> = ensureWorkerReady
let document: PDFDocumentEntry | undefined

void component
void prepareWorker
void document
`,
    'utf8'
  )
  await writeFile(
    path.join(consumerDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        lib: ['ES2022', 'DOM'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        strict: true,
        target: 'ES2022',
      },
      include: ['index.ts'],
    }),
    'utf8'
  )

  const tscPath = path.join(packageRoot, 'node_modules', 'typescript', 'bin', 'tsc')
  await execFileAsync(process.execPath, [tscPath, '--project', 'tsconfig.json'], {
    cwd: consumerDir,
  })

  globalThis.console.log(`Validated packed package ${packResult.filename} from a clean consumer.`)
} finally {
  await rm(tempRoot, { recursive: true, force: true })
}
