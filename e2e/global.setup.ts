/**
 * Global auth setup — signs in once, saves browser storage state.
 * All other tests reuse this session via storageState.
 *
 * Set TEST_EMAIL / TEST_PASSWORD in .env.test or as env vars before running.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set TEST_EMAIL and TEST_PASSWORD env vars before running e2e tests.\n" +
        "Example: TEST_EMAIL=you@example.com TEST_PASSWORD=secret npx playwright test"
    );
  }

  // Unauthenticated hit redirects to Clerk sign-in
  await page.goto("/");
  await page.waitForURL(/sign-in|accounts\.clerk/);

  // Fill Clerk sign-in form
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: /continue|next/i }).click();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|continue/i }).click();

  // Wait for dashboard
  await page.waitForURL(/\/flow/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/flow/);

  await page.context().storageState({ path: AUTH_FILE });
});
