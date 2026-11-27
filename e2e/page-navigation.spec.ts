// SPDX-FileCopyrightText: 2026 LibreCode coop and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

// 5 pages with different sizes and orientations (portrait, landscape, small, portrait, wide).
const fixture = path.resolve("e2e/fixtures/mixed-pages.pdf");
const SAMPLE_URL = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

async function loadFixture(page: Page) {
  await page.route(SAMPLE_URL, (route) => route.fulfill({
    path: fixture,
    contentType: "application/pdf",
    headers: { "access-control-allow-origin": "*" },
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Load sample PDF" }).click();
  await expect(page.locator(".page-wrapper")).toHaveCount(5);
  await expect(page.getByTestId("current-page")).toHaveText("Document 1 · Page 1");
}

/** Public API of the mounted viewer, as a host would call it. */
const goToPage = (page: Page, pageIndex: number, docIndex = 0) => page.evaluate(
  ([p, d]) => {
    const root = document.querySelector(".pdf-elements-root") as any;
    return root.__vueParentComponent.proxy.goToPage(p, d) as boolean;
  },
  [pageIndex, docIndex],
);

/**
 * Geometry of a page relative to what the user can see. The demo viewer grows with
 * its content, so the window scrolls; a host with a fixed height scrolls the viewer.
 */
const pageInViewport = (page: Page, wrapperIndex: number) => page.evaluate((i) => {
  const root = document.querySelector(".pdf-elements-root") as HTMLElement;
  const scrolls = root.scrollHeight > root.clientHeight + 1;
  const top = scrolls ? root.getBoundingClientRect().top : 0;
  const height = scrolls ? root.clientHeight : window.innerHeight;
  const rect = (document.querySelectorAll(".page-wrapper")[i] as HTMLElement).getBoundingClientRect();
  return { top: rect.top - top, bottom: rect.bottom - top, viewHeight: height };
}, wrapperIndex);

const offsetFromTop = async (page: Page, wrapperIndex: number) => (await pageInViewport(page, wrapperIndex)).top;

const scrollToStart = (page: Page) => page.evaluate(() => {
  const root = document.querySelector(".pdf-elements-root") as HTMLElement;
  root.scrollTop = 0;
  window.scrollTo(0, 0);
});

const currentPage = (page: Page) => page.getByTestId("current-page");

test.describe("page navigation", () => {
  test("goToPage scrolls pages of different sizes and orientations to the top", async ({ page }) => {
    await loadFixture(page);

    for (const [pageIndex, label] of [[1, "Page 2"], [2, "Page 3"], [3, "Page 4"]] as const) {
      expect(await goToPage(page, pageIndex)).toBe(true);
      await expect(currentPage(page)).toHaveText(`Document 1 · ${label}`);
      expect(Math.abs(await offsetFromTop(page, pageIndex))).toBeLessThan(2);
    }

    expect(await goToPage(page, 0)).toBe(true);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 1");
  });

  test("the last page becomes current even when it cannot reach the top", async ({ page }) => {
    await loadFixture(page);
    expect(await goToPage(page, 4)).toBe(true);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 5");
  });

  test("rejects pages that do not exist", async ({ page }) => {
    await loadFixture(page);
    expect(await goToPage(page, 5)).toBe(false);
    expect(await goToPage(page, -1)).toBe(false);
    expect(await goToPage(page, 0, 1)).toBe(false);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 1");
  });

  test("follows scrolling and keeps the navigated page current after a resize", async ({ page }) => {
    await loadFixture(page);
    expect(await goToPage(page, 2)).toBe(true);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 3");

    await page.setViewportSize({ width: 700, height: 500 });
    await expect(currentPage(page)).toHaveText(/Document 1 · Page \d/);
    const shown = Number((await currentPage(page).innerText()).match(/Page (\d)/)![1]) - 1;
    const rect = await pageInViewport(page, shown);
    // whatever page is reported must really be on screen
    expect(rect.bottom).toBeGreaterThan(0);
    expect(rect.top).toBeLessThan(rect.viewHeight);

    await scrollToStart(page);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 1");
  });

  test("stays consistent after zooming", async ({ page }) => {
    await loadFixture(page);
    expect(await goToPage(page, 1)).toBe(true);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 2");

    await page.evaluate(() => {
      const root = document.querySelector(".pdf-elements-root") as any;
      root.__vueParentComponent.proxy.commitZoom(0.5);
    });
    // geometry is re-reserved from the PDF.js viewport: the page is still reachable at the top
    expect(await goToPage(page, 3)).toBe(true);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 4");
    expect(Math.abs(await offsetFromTop(page, 3))).toBeLessThan(2);
  });

  test("navigates to the right page when zoom and goToPage run in the same tick", async ({ page }) => {
    await loadFixture(page);
    const accepted = await page.evaluate(() => {
      const proxy = (document.querySelector(".pdf-elements-root") as any).__vueParentComponent.proxy;
      proxy.commitZoom(0.5);
      return proxy.goToPage(2) as boolean;
    });
    expect(accepted).toBe(true);

    // The request waits for the pages to re-reserve their size, then lands on the new layout.
    await expect(currentPage(page)).toHaveText("Document 1 · Page 3");
    await expect.poll(async () => Math.abs(await offsetFromTop(page, 2))).toBeLessThan(2);
    // ...and stays there once the zoomed pages finish rendering.
    await page.waitForTimeout(1000);
    await expect(currentPage(page)).toHaveText("Document 1 · Page 3");
  });

  test("applies a navigation requested while the viewer is hidden once it is shown", async ({ page }) => {
    await loadFixture(page);
    const viewer = page.locator(".viewer");
    await viewer.evaluate((el) => { (el as HTMLElement).style.display = "none"; });
    // e.g. the viewer sits in an inactive tab: the request is accepted but there is no layout yet
    expect(await goToPage(page, 2)).toBe(true);
    await viewer.evaluate((el) => { (el as HTMLElement).style.display = ""; });

    await expect(currentPage(page)).toHaveText("Document 1 · Page 3");
    await expect.poll(async () => Math.abs(await offsetFromTop(page, 2))).toBeLessThan(2);
  });

  test("navigates across multiple documents", async ({ page }) => {
    await loadFixture(page);
    await page.locator('input[type="file"]').setInputFiles(fixture);
    await expect(page.locator(".page-wrapper")).toHaveCount(10);

    expect(await goToPage(page, 1, 1)).toBe(true);
    await expect(currentPage(page)).toHaveText("Document 2 · Page 2");
    expect(Math.abs(await offsetFromTop(page, 6))).toBeLessThan(2);
    expect(await goToPage(page, 0, 2)).toBe(false);
  });
});
