// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect } from "@playwright/test";

test("add a signature element", async({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Load sample PDF"}).click();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", {name: "Add Signature"}).click();
  await expect(page.getByRole("button", {name: "Click to place"})).toBeVisible();
  await page.locator(".overlay").first().click({position: {x:100,y:100}});
  await expect(page.locator(".signature-box").first()).toBeVisible();

})
