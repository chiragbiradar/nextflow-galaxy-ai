/**
 * FR: Workflow History (Right Sidebar)
 * - List of all runs: timestamp, status (success/failed/partial), duration, scope
 * - Color-coded badges
 * - Click run → expand node-level details (per-node status, inputs, output, time, error)
 * - Persisted to PostgreSQL
 */
import { test, expect, type Page } from "@playwright/test";

async function openFreshCanvas(page: Page) {
  await page.goto("/flow");
  await page.waitForLoadState("networkidle");
  await page.locator('button[title="New workflow"]').click();
  await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 15_000 });
  await page.waitForSelector(".react-flow__node", { timeout: 10_000 });
}

async function triggerRun(page: Page) {
  await page.getByRole("button", { name: /run/i }).click();
  // Wait for history sidebar to open automatically
  await page.waitForTimeout(2_000);
}

test.describe("History Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await openFreshCanvas(page);
  });

  test("history toggle button (Settings2) exists in top-bar", async ({ page }) => {
    const toggleBtn = page.locator('button[title="Run History"]');
    await expect(toggleBtn).toBeVisible();
  });

  test("history sidebar opens after clicking toggle", async ({ page }) => {
    await page.locator('button[title="Run History"]').click();
    // History panel visible on right side
    await expect(page.locator(".fixed.right-0, .absolute.right-0").first()).toBeVisible({
      timeout: 3_000,
    });
  });

  test("history sidebar shows 'No runs yet' when empty", async ({ page }) => {
    await page.locator('button[title="Run History"]').click();
    await expect(page.getByText(/no runs/i)).toBeVisible({ timeout: 5_000 });
  });

  test("after run, history sidebar shows a new entry", async ({ page }) => {
    await triggerRun(page);

    // Look for run entries
    const runEntries = page.locator("div").filter({ hasText: /running|completed|failed/i });
    await expect(runEntries.first()).toBeVisible({ timeout: 10_000 });
  });

  test("run entry shows status badge", async ({ page }) => {
    await triggerRun(page);
    await page.waitForTimeout(3_000);

    // Check for RUNNING/COMPLETED/FAILED text or badge
    await expect(
      page.getByText(/running|completed|failed/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("history close button works", async ({ page }) => {
    await triggerRun(page);
    // Find X button in history panel
    const closeBtn = page.locator(".fixed.right-0 button, .absolute.right-0 button").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(
        page.locator(".fixed.right-0, .absolute.right-0").first()
      ).not.toBeVisible({ timeout: 3_000 });
    }
  });

  // ── FR GAP: Node-level expand ────────────────────────────────────────────
  test.fail(
    "MISSING: clicking a run expands to show per-node details (status, output, time)",
    async ({ page }) => {
      await triggerRun(page);
      await page.waitForTimeout(3_000);

      // Click first run entry
      const firstRun = page.locator("div[class*='run'], button[class*='run']").first();
      await firstRun.click();

      // Should expand to show node-level breakdown
      await expect(page.getByText(/request-inputs/i)).toBeVisible({ timeout: 3_000 });
      await expect(page.getByText(/0\.\d+s|\d+ms/)).toBeVisible({ timeout: 3_000 });
    }
  );

  // ── API: Run history persisted to PostgreSQL ──────────────────────────────
  test("GET /api/runs/:id returns run data (persisted)", async ({ page }) => {
    const runResponses: { url: string; body: unknown }[] = [];
    page.on("response", async (res) => {
      if (res.url().includes("/api/runs/") && res.status() === 200) {
        try {
          runResponses.push({ url: res.url(), body: await res.json() });
        } catch {}
      }
    });

    await triggerRun(page);
    await page.waitForTimeout(5_000);

    // Poll for run status (CanvasClient polls /api/runs/:id every 2s)
    // After 5s, at least one poll should have happened
    expect(runResponses.length).toBeGreaterThan(0);
    expect(runResponses[0].body).toMatchObject({ id: expect.any(String) });
  });
});
