// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig(async ({ command, mode }) => {
  const isDemo = command === 'serve' || mode === 'demo'
  const plugins = [vue()]

  if (!isDemo) {
    plugins.push(
      dts({
        entryRoot: 'src',
        outDir: 'dist',
        insertTypesEntry: true,
        include: ['src'],
        exclude: ['examples', 'tests'],
      })
    )
  }

  if (mode === 'report') {
    const { visualizer } = await import('rollup-plugin-visualizer')
    plugins.push(
      visualizer({
        filename: 'dist/bundle-report.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
      })
    )
  }

  return {
    root: isDemo ? 'examples' : undefined,
    server: {
      host: '0.0.0.0',
    },
    plugins,
    build: isDemo
      ? {
          outDir: path.resolve(__dirname, 'dist-demo'),
          emptyOutDir: true,
        }
      : {
          lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'PDFElements',
            formats: ['es'],
            fileName: 'index',
          },
          rollupOptions: {
            external: ['vue'],
            output: {
              globals: {
                vue: 'Vue',
              },
            },
          },
        },
  }
})
