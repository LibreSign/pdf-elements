// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect } from "@playwright/test";

test("load pdf", async({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Load sample PDF"}).click();
  await expect(page.locator("canvas").first()).toBeVisible();
})
