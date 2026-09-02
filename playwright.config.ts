import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load the dev environment (Convex dev deployment + Clerk dev instance).
dotenv.config({ path: path.resolve(__dirname, ".env.dev.local") });
// @clerk/testing reads CLERK_PUBLISHABLE_KEY; the app stores it as NEXT_PUBLIC_*.
process.env.CLERK_PUBLISHABLE_KEY =
  process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: "./e2e",
  // Shared dev backend → run serially for deterministic data assertions.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    channel: process.env.CI ? undefined : "chrome", // local: installed Chrome; CI: bundled chromium
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // 1) Authenticate once, persist the Clerk session to storage.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // 2) Authenticated admin-portal specs reuse that session.
    {
      name: "admin",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
        storageState: "e2e/.auth/admin.json",
      },
    },
  ],
  // Auto-start the web dev server against the dev deployment.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
