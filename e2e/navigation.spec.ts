import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers";

const PAGES: { path: string; heading: RegExp }[] = [
  { path: "/", heading: /Welcome to BuildSimpli|Home/i },
  { path: "/projects", heading: /Projects/i },
  { path: "/clients", heading: /Clients/i },
  { path: "/teams", heading: /Teams/i },
  { path: "/earnings", heading: /Earnings|Revenue/i },
  { path: "/settings", heading: /Settings/i },
  { path: "/search", heading: /Search/i },
  { path: "/upload", heading: /Upload/i },
  { path: "/address-history", heading: /Address/i },
  { path: "/toolbox-talks", heading: /Toolbox/i },
];

test.describe("admin portal navigation", () => {
  for (const { path, heading } of PAGES) {
    test(`loads ${path}`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // Must not bounce to the auth wall.
      await expect(page).not.toHaveURL(/\/sign-in/);
      // Something recognizable rendered.
      await expect(page.getByText(heading).first()).toBeVisible({ timeout: 20_000 });
      // No unexpected client errors on load.
      await page.waitForTimeout(1500);
      expect(errors(), `console errors on ${path}`).toEqual([]);
    });
  }
});
