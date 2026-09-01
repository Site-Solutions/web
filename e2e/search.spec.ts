import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers";

// Exercises the project-scoped address search end-to-end (backed by
// convex/addressSearch, which was rewritten to match on the canonical
// normalizedAddress index). We assert the search runs and renders a result
// state without crashing or erroring — not a specific match, so it stays
// deterministic against whatever dev data exists.
test.describe("address search", () => {
  test("runs a project-scoped address search without error", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/search");
    await expect(page.getByText("Address Search").first()).toBeVisible();

    // Pick the first real project in the picker.
    const select = page.locator("select").first();
    await expect(select).toBeVisible();
    await select.selectOption({ index: 1 });

    // Enter an address and search.
    await page.getByPlaceholder("Enter address...").fill("500 PEARL ST");
    await page.getByRole("button", { name: /^search$/i }).click();

    // The search resolves to a results list or a "no results" state — either is
    // fine; the point is the query executed and the page didn't crash.
    await page.waitForTimeout(2500);
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.getByText("Address Search").first()).toBeVisible();
    expect(errors(), "console errors during search").toEqual([]);
  });

  test("case/format-insensitive input is accepted", async ({ page }) => {
    await page.goto("/search");
    await page.locator("select").first().selectOption({ index: 1 });
    // Lowercase + trailing city — the canonical normalizer should handle it.
    await page.getByPlaceholder("Enter address...").fill("500 pearl street, manhattan, ny");
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText("Address Search").first()).toBeVisible();
  });
});
