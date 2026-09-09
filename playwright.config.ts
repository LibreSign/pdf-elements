// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:5173/",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/",
    reuseExistingServer: !process.env.CI
  }

});
