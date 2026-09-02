import { test, expect } from "@playwright/test";

// Run these WITHOUT the stored admin session to verify the auth wall.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("access control (unauthenticated)", () => {
  for (const path of ["/", "/projects", "/clients", "/earnings", "/settings"]) {
    test(`redirects ${path} to sign-in when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 });
      await expect(page.locator('input[name="identifier"]')).toBeVisible();
    });
  }
});
