// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect } from "@playwright/test";

test("demo loads", async({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", {name: "Load sample PDF"})).toBeVisible();
})
