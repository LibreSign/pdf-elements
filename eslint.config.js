// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

const js = require('@eslint/js')
const vue = require('eslint-plugin-vue')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const vueParser = require('vue-eslint-parser')
const vitest = require('eslint-plugin-vitest')

const vitestGlobals = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  it: 'readonly',
  test: 'readonly',
  vi: 'readonly',
}

module.exports = [
  {
    ignores: ['dist/**', 'dist-demo/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...vue.configs['flat/essential'].rules,
      ...tsPlugin.configs.recommended.rules,
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: vitestGlobals,
    },
    rules: {
      ...(vitest.configs?.recommended?.rules || {}),
    },
  },
]
