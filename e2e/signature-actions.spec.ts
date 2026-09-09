// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later


import {expect, test} from "@playwright/test";

test.beforeEach(async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Load sample PDF"}).click();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", {name: "Add Signature"}).click();
  await expect(page.getByRole("button", {name: "Click to place"})).toBeVisible();
  await page.locator(".overlay").first().click({position: {x:100,y:100}});
  await expect(page.locator(".resize-handle").first()).toBeVisible();
})

test("moves a signature element", async({page}) => {
  const before = await page.locator(".signature-box").boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 150, before.y + before.height / 2 + 100, {steps:10});
  await page.mouse.up();
  const after = await page.locator(".signature-box").boundingBox();
  expect(after.x).not.toBe(before.x);
})

test("select a signature element", async ({page}) => {
  await page.locator(".overlay").first().click({position: {x:300, y:400}});
  await expect(page.locator(".resize-handle")).toHaveCount(0);
  await page.locator(".signature-box").click();
  await expect(page.locator(".resize-handle").first()).toBeVisible();
})

test("resize a signature element", async ({page}) => {
  const before = await page.locator(".signature-box").boundingBox();
  const resizeHandle = await page.locator(".resize-handle.handle-bottom-right").boundingBox();
  await page.mouse.move(resizeHandle.x + resizeHandle.width / 2, resizeHandle.y + resizeHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeHandle.x + resizeHandle.width / 2 + 150, resizeHandle.y + resizeHandle.height / 2 + 100, {steps:10});
  await page.mouse.up();
  const after = await page.locator(".signature-box").boundingBox();
  expect(after.width).not.toBe(before.width);
})

test("delete a signature element", async({page}) => {
  await expect(page.locator(".delete-btn")).toBeVisible();
  await page.locator(".delete-btn").click();
  await expect(page.locator(".signature-box")).toHaveCount(0);
})

test("zoom a pdf element", async({page})=> {
  const before = await page.locator(".signature-box").first().boundingBox();
  await page.keyboard.down("Control");
  await page.mouse.wheel(0,-100);
  await page.keyboard.up("Control");
  const after = await page.locator(".signature-box").first().boundingBox();
  await expect(page.locator(".signature-box")).toHaveCount(1)
  expect(after.x).not.toBe(before.y);
})
