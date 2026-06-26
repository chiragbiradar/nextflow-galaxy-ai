/**
 * FR: Authentication
 * - Clerk for everything
 * - All workflow routes protected
 * - Unauthenticated traffic redirects to Clerk
 */
import { test, expect } from "@playwright/test";

// These tests run WITHOUT the saved auth state — use a fresh context
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("unauthenticated / redirects to Clerk sign-in", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/sign-in|accounts\.clerk/, { timeout: 10_000 });
    await expect(page.url()).toMatch(/sign-in|accounts\.clerk/);
  });

  test("unauthenticated /flow redirects to Clerk sign-in", async ({ page }) => {
    await page.goto("/flow");
    await page.waitForURL(/sign-in|accounts\.clerk/, { timeout: 10_000 });
    await expect(page.url()).toMatch(/sign-in|accounts\.clerk/);
  });

  test("unauthenticated /workflows/* redirects to Clerk sign-in", async ({ page }) => {
    await page.goto("/workflows/fake-id/canvas");
    await page.waitForURL(/sign-in|accounts\.clerk/, { timeout: 10_000 });
    await expect(page.url()).toMatch(/sign-in|accounts\.clerk/);
  });

  test("Clerk sign-in page is reachable", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/sign-in|accounts\.clerk/);
    // Clerk renders an email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });

  test("no marketing/home page — root always bounces to auth or dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    const url = page.url();
    // Must go to either clerk sign-in OR the dashboard — never a marketing page
    expect(url).toMatch(/sign-in|accounts\.clerk|\/flow/);
  });
});
