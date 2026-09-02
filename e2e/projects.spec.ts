import { test, expect } from "@playwright/test";

test.describe("projects", () => {
  test("lists projects for the org", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText(/Projects/i).first()).toBeVisible();
    // At least one project card/link is present (dev data has several).
    const projectLinks = page.locator('a[href*="/projects/"]');
    await expect(projectLinks.first()).toBeVisible({ timeout: 20_000 });
    expect(await projectLinks.count()).toBeGreaterThan(0);
  });

  test("opens a project and every tab renders", async ({ page }) => {
    await page.goto("/projects");
    await page.locator('a[href*="/projects/"]').first().click();
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+/i, { timeout: 20_000 });

    const tabs = [
      "Daily Reports",
      "Jobs",
      "Invoices",
      "Task Lists",
      "Incidents",
      "Toolbox Talks",
      "Schedules",
      "Photos",
      "Files",
    ];
    for (const tab of tabs) {
      await page.getByRole("link", { name: tab, exact: true }).first().click();
      // Tab content area should render without crashing / bouncing to sign-in.
      await expect(page).not.toHaveURL(/\/sign-in/);
      await expect(page.getByText(new RegExp(tab, "i")).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
