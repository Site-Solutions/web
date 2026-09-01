import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers";

// The jobs list is backed by org-scoped Convex reads (jobs.getByProject etc.).
// This exercises the list render + the status filters without mutating data.
test.describe("project jobs", () => {
  async function openFirstProjectJobs(page: import("@playwright/test").Page) {
    await page.goto("/projects");
    const href = await page.locator('a[href*="/projects/"]').first().getAttribute("href");
    const base = (href || "").replace(/\/[^/]+$/, "");
    await page.goto(`${base}/jobs`);
    return base;
  }

  test("renders the jobs list with New Job and status filters", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openFirstProjectJobs(page);
    await expect(page.getByText(/Jobs/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /new job/i })).toBeVisible();
    for (const f of ["All", "Active", "Completed", "Cancelled"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${f}$`) })).toBeVisible();
    }
    await page.waitForTimeout(1500);
    expect(errors(), "console errors on jobs list").toEqual([]);
  });

  test("status filters respond without error", async ({ page }) => {
    await openFirstProjectJobs(page);
    await expect(page.getByText(/Jobs/i).first()).toBeVisible();
    await page.getByRole("button", { name: /^Active$/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^Completed$/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^All$/ }).click();
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.getByRole("button", { name: /new job/i })).toBeVisible();
  });
});
