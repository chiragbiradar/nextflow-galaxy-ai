/**
 * FR: Workflow Canvas
 * - Opens with Request-Inputs + Response pre-placed (not deletable)
 * - + picker in bottom-center floating toolbar
 * - Pan, zoom, fit-view, MiniMap (bottom-right), dot grid
 * - Undo/Redo for node operations
 * - Animated purple edges
 * - DAG-only (no cycles)
 * - Export/Import JSON
 * - Workflow name editable
 */
import { test, expect, type Page } from "@playwright/test";

async function createAndOpenCanvas(page: Page): Promise<string> {
  await page.goto("/flow");
  await page.waitForLoadState("networkidle");
  await page.locator('button[title="New workflow"]').click();
  await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 15_000 });
  return page.url();
}

test.describe("Canvas — Structure", () => {
  let canvasUrl: string;

  test.beforeEach(async ({ page }) => {
    canvasUrl = await createAndOpenCanvas(page);
  });

  test("canvas page loads without error", async ({ page }) => {
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 10_000 });
  });

  test("Request-Inputs node is pre-placed on canvas", async ({ page }) => {
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Response node is pre-placed on canvas", async ({ page }) => {
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Response" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("exactly 2 nodes on a new canvas", async ({ page }) => {
    const nodes = page.locator(".react-flow__node");
    await expect(nodes).toHaveCount(2, { timeout: 10_000 });
  });

  test("dot grid background is rendered", async ({ page }) => {
    await expect(page.locator(".react-flow__background")).toBeVisible();
  });

  test("MiniMap is visible (bottom-right)", async ({ page }) => {
    const minimap = page.locator(".react-flow__minimap");
    await expect(minimap).toBeVisible();
  });

  test("top bar has workflow name input", async ({ page }) => {
    const nameInput = page.locator("input[class*='font-medium']").first();
    await expect(nameInput).toBeVisible();
  });

  test("workflow name is editable", async ({ page }) => {
    const nameInput = page.locator("input[class*='font-medium']").first();
    await nameInput.fill("My Test Workflow");
    await expect(nameInput).toHaveValue("My Test Workflow");
  });

  test("top bar has Run button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /run/i })
    ).toBeVisible();
  });

  test("top bar has back arrow to return to dashboard", async ({ page }) => {
    const backBtn = page.locator("button").filter({ has: page.locator("svg") }).first();
    await backBtn.click();
    await page.waitForURL(/\/flow/, { timeout: 5_000 });
    expect(page.url()).toMatch(/\/flow/);
  });

  test("bottom floating toolbar with + (add node) button visible", async ({ page }) => {
    const toolbar = page.locator("div.absolute.bottom-4");
    await expect(toolbar).toBeVisible();
    // + button
    const plusBtn = toolbar.locator('button[title="Add node"]');
    await expect(plusBtn).toBeVisible();
  });
});

test.describe("Canvas — Add Node Picker", () => {
  test.beforeEach(async ({ page }) => {
    await createAndOpenCanvas(page);
    await page.waitForSelector(".react-flow__node", { timeout: 10_000 });
  });

  test("+ picker opens when clicking + button", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    // Modal/picker should appear
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 5_000 });
  });

  test("picker has search input", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test("picker shows Crop Image option", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await expect(page.getByText(/Crop Image/i)).toBeVisible({ timeout: 5_000 });
  });

  test("picker shows Gemini option", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await expect(page.getByText(/Gemini/i)).toBeVisible({ timeout: 5_000 });
  });

  test("picker search filters results", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill("crop");
    await expect(page.getByText(/Crop Image/i)).toBeVisible();
  });

  test("picker closes on Escape", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder(/search/i)).not.toBeVisible({ timeout: 3_000 });
  });

  test("add Crop Image node from picker → appears on canvas", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Crop Image/i).click();
    await expect(
      page.locator(".react-flow__node").filter({ hasText: /Crop Image/i })
    ).toBeVisible({ timeout: 5_000 });
    // Total nodes now 3
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
  });

  test("add Gemini node from picker → appears on canvas", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Gemini/i).click();
    await expect(
      page.locator(".react-flow__node").filter({ hasText: /Gemini|LLM/i })
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
  });
});

test.describe("Canvas — Features", () => {
  test.beforeEach(async ({ page }) => {
    await createAndOpenCanvas(page);
    await page.waitForSelector(".react-flow__node", { timeout: 10_000 });
  });

  test("MiniMap toggle button exists", async ({ page }) => {
    const toolbar = page.locator("div.absolute.bottom-4");
    // Map icon button on right side
    const mapBtn = toolbar.locator("button").last();
    await expect(mapBtn).toBeVisible();
  });

  // ── FR GAP: Undo/Redo ────────────────────────────────────────────────────
  test.fail("MISSING: Ctrl+Z undoes last node addition", async ({ page }) => {
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Crop Image/i).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    await page.keyboard.press("Control+z");
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
  });

  // ── FR GAP: Export/Import JSON ───────────────────────────────────────────
  test.fail("MISSING: Export workflow as JSON", async ({ page }) => {
    // Should have an export button somewhere
    const exportBtn = page.getByRole("button", { name: /export/i });
    await expect(exportBtn).toBeVisible();
  });

  // ── FR GAP: Animated edges ───────────────────────────────────────────────
  test.fail("MISSING: edges have animated: true (purple animated edges)", async ({
    page,
  }) => {
    // Add Gemini and connect to Request-Inputs
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Gemini/i).click();
    // After connecting, edge should have animated class
    const animatedEdge = page.locator(".react-flow__edge.animated");
    await expect(animatedEdge).toBeVisible({ timeout: 5_000 });
  });

  // ── FR GAP: DAG cycles ───────────────────────────────────────────────────
  test.fail("MISSING: cycle connection is rejected", async ({ page }) => {
    // TODO: drag edge from a node back to itself — should be rejected
    // This requires ReactFlow cycle detection which is not yet implemented
    expect(true).toBe(false); // placeholder
  });

  // ── FR GAP: Type-safe connections ────────────────────────────────────────
  test.fail("MISSING: image output cannot connect to text input", async ({ page }) => {
    // Requires type validation on connections — not implemented
    expect(true).toBe(false);
  });
});

test.describe("Canvas — Persistence", () => {
  test("workflow auto-saves (PATCH request on node/edge change)", async ({ page }) => {
    const patchRequests: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && req.url().includes("/api/workflows/")) {
        patchRequests.push(req.url());
      }
    });

    await createAndOpenCanvas(page);
    await page.waitForSelector(".react-flow__node", { timeout: 10_000 });

    // Add a node to trigger auto-save
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Crop Image/i).click();

    // Wait for debounced auto-save (1200ms + buffer)
    await page.waitForTimeout(2500);

    expect(patchRequests.length).toBeGreaterThan(0);
  });

  test("workflow persists after page reload", async ({ page }) => {
    const url = await createAndOpenCanvas(page);
    await page.waitForSelector(".react-flow__node", { timeout: 10_000 });

    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Crop Image/i).click();
    await page.waitForTimeout(2500); // Wait for auto-save

    await page.reload();
    await page.waitForSelector(".react-flow__node", { timeout: 10_000 });
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
  });
});
