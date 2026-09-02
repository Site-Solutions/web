import { test as setup, expect } from "@playwright/test";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { ADMIN, ADMIN_STORAGE } from "./constants";

// Signs in as the admin test account programmatically (via the Clerk testing
// token — no UI driving, no bot-detection fights) and persists the session so
// every other spec starts already authenticated.
setup("authenticate as admin", async ({ page }) => {
  await clerkSetup();
  await setupClerkTestingToken({ page });

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier: ADMIN.email, password: ADMIN.password },
  });

  // Land on an authenticated page and confirm we're past the auth wall.
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page.getByRole("navigation").getByText("Projects").first()).toBeVisible();

  await page.context().storageState({ path: ADMIN_STORAGE });
});
