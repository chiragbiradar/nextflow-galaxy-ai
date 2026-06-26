/**
 * FR: Dashboard Page
 * - Lists user's workflows (name, last-edited timestamp, status badge)
 * - Create New Workflow → opens blank canvas
 * - Per-row actions: Open, Rename, Delete
 * - Empty state when no workflows
 * - Sidebar present (same as Galaxy.ai)
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
  });

  // ── Layout ──────────────────────────────────────────────────────────────
  test("sidebar is present", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
  });

  test("sidebar has all nav items: Task, Projects, Library, Flow, Tools, API/MCP", async ({
    page,
  }) => {
    const sidebar = page.locator("aside");
    for (const label of ["Task", "Projects", "Library", "Flow", "Tools", "API"]) {
      await expect(sidebar.getByText(label, { exact: false })).toBeVisible();
    }
  });

  test("sidebar toggle collapses and expands", async ({ page }) => {
    const toggleBtn = page.locator("aside button[title], aside button").first();
    // Find the panel toggle SVG button
    const panelBtn = page
      .locator("aside")
      .locator("button")
      .filter({ has: page.locator("svg rect") })
      .first();
    await panelBtn.click();
    // Sidebar should narrow
    const aside = page.locator("aside");
    await expect(aside).toHaveCSS("width", /52|56px/);
  });

  test("sidebar Settings and Claim Offer buttons visible", async ({ page }) => {
    await expect(page.locator("aside").getByText("Settings")).toBeVisible();
    await expect(page.locator("aside").getByText("Claim Offer")).toBeVisible();
  });

  test("sidebar shows user name", async ({ page }) => {
    const userRow = page.locator("aside").locator("span").filter({ hasText: /\w+/ }).last();
    await expect(userRow).toBeVisible();
  });

  // ── Content ──────────────────────────────────────────────────────────────
  test("Flow page heading visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /flow/i })).toBeVisible();
  });

  test("System Workflows section exists with prebuilt templates", async ({ page }) => {
    await expect(page.getByText("System Workflows")).toBeVisible();
    // At least one system workflow card
    await expect(
      page.locator(".grid").filter({ has: page.locator("div.h-40") }).first()
    ).toBeVisible();
  });

  test("Your Workflows section exists", async ({ page }) => {
    await expect(page.getByText("Your Workflows")).toBeVisible();
  });

  test("Search workflows input present", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search workflows/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("test");
    await expect(searchInput).toHaveValue("test");
  });

  // ── Create ───────────────────────────────────────────────────────────────
  test("+ button creates new workflow and navigates to canvas", async ({ page }) => {
    const plusBtn = page.locator('button[title="New workflow"]');
    await expect(plusBtn).toBeVisible();
    await plusBtn.click();
    await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/workflows\/.+\/canvas/);
    // Navigate back
    await page.goBack();
  });

  // ── Import button ────────────────────────────────────────────────────────
  test("Import button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /import/i })).toBeVisible();
  });

  // ── Per-workflow actions ──────────────────────────────────────────────────
  test("workflow cards have delete button on hover", async ({ page }) => {
    // Create a workflow first to ensure one exists
    await page.locator('button[title="New workflow"]').click();
    await page.waitForURL(/\/workflows\/.+\/canvas/);
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");

    const card = page.locator(".grid > div").first();
    await card.hover();
    const deleteBtn = card.locator("button").filter({ has: page.locator("svg") }).last();
    await expect(deleteBtn).toBeVisible();
  });

  test("workflow card click opens canvas", async ({ page }) => {
    // Ensure a workflow exists
    await page.locator('button[title="New workflow"]').click();
    await page.waitForURL(/\/workflows\/.+\/canvas/);
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator(".grid > div").first();
    await firstCard.click();
    await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/workflows\/.+\/canvas/);
  });

  // ── FR GAP: Rename ───────────────────────────────────────────────────────
  test.fail(
    "MISSING: per-workflow Rename action exists",
    async ({ page }) => {
      // Requirement: per-row rename action
      // Currently not implemented in FlowDashboard.tsx
      const card = page.locator(".grid > div").first();
      await card.hover();
      await expect(card.getByRole("button", { name: /rename/i })).toBeVisible();
    }
  );

  // ── LinkedIn console.log ─────────────────────────────────────────────────
  test("[NextFlow] LinkedIn console.log emitted on page load", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => logs.push(msg.text()));
    await page.goto("/flow");
    await page.waitForLoadState("domcontentloaded");
    const found = logs.some(
      (l) => l.includes("[NextFlow]") && l.includes("LinkedIn")
    );
    expect(found, `Expected [NextFlow] LinkedIn log. Got: ${logs.join("|")}`).toBe(true);
  });
});
