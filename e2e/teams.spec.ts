import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers";

// Teams are backed by org-scoped taskForces reads. Covers the list and drill-in
// to a team detail page.
test.describe("teams", () => {
  test("lists teams and opens a team detail", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/teams");
    await expect(page.getByText(/Teams/i).first()).toBeVisible();

    const teamLink = page.locator('a[href*="/teams/"]').first();
    if (await teamLink.count()) {
      await teamLink.click();
      await expect(page).toHaveURL(/\/teams\/[a-z0-9]+/i, { timeout: 15000 });
      await expect(page).not.toHaveURL(/\/sign-in/);
    }
    await page.waitForTimeout(1200);
    expect(errors(), "console errors in teams").toEqual([]);
  });
});
