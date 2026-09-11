// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("axe", () => {
test.beforeEach(async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Load sample PDF"}).click();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", {name: "Add Signature"}).click();
  await expect(page.getByRole("button", {name: "Click to place"})).toBeVisible();
  await page.locator(".overlay").first().click({position: {x:100,y:100}});
  await expect(page.locator(".resize-handle").first()).toBeVisible();
})

test("has no accessibility violations", async({page})=>{
  const results = await new AxeBuilder({page}).analyze();
  const summary = results.violations.map(v => `${v.id} (${v.impact}): ${v.nodes.length} nodes`);
  expect(summary).toEqual([]);
  expect(results.violations).toEqual([]);
})
})

test.describe("keyboard", () => {
test("toolbar buttons can be opened with the keyboard", async({page})=>{
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Load sample PDF" });
  await btn.focus();
  await expect(btn).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("canvas").first()).toBeVisible();

})
  test("focus is visible on toolbar buttons", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: "Load sample PDF" });
    const focusStyles = () => btn.evaluate(el => {
      const style = getComputedStyle(el);
      return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow].join(" | ");
    });
    const unfocused = await focusStyles();
    await page.keyboard.press("Tab");
    await expect(btn).toBeFocused();
    const focused = await focusStyles();
    expect(focused).not.toBe(unfocused);
  })
})
