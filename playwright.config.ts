import { defineConfig, devices } from "@playwright/test";

// Keys come from the author's .env.local (Clerk secret for test sign-in, Supabase secret to
// reset the test users). Nothing here prints them.
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI sets them as real environment variables instead
}

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global.setup.ts",
  workers: 1,
  fullyParallel: false,
  // A whole dry run is ~14 model calls on rate-limited free-tier models.
  timeout: 15 * 60_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: { baseURL: BASE, trace: "retain-on-failure", viewport: { width: 1280, height: 900 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: BASE, reuseExistingServer: true, timeout: 120_000 },
});
