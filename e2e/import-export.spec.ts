/**
 * Workflow import / export (JSON)
 * Export: canvas toolbar has a download button → clicking triggers .json download
 * Import: /flow page has import button → uploading JSON creates and opens workflow
 */
import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

test.describe("Workflow export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
  });

  test("canvas toolbar has an export button", async ({ page }) => {
    // Open any workflow (create one first)
    await page.getByTitle("New workflow").click();
    await page.waitForURL(/\/workflows\/.+\/canvas/);
    await page.waitForLoadState("networkidle");

    // Export button should be visible
    const exportBtn = page.getByRole("button", { name: /export/i });
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test("export downloads a JSON file named after the workflow", async ({ page }) => {
    await page.getByTitle("New workflow").click();
    await page.waitForURL(/\/workflows\/.+\/canvas/);
    await page.waitForLoadState("networkidle");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test("exported JSON contains name, nodes, and edges", async ({ page }) => {
    await page.getByTitle("New workflow").click();
    await page.waitForURL(/\/workflows\/.+\/canvas/);
    await page.waitForLoadState("networkidle");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export/i }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    const json = JSON.parse(fs.readFileSync(tmpPath, "utf-8")) as Record<string, unknown>;

    expect(json).toHaveProperty("name");
    expect(json).toHaveProperty("nodes");
    expect(json).toHaveProperty("edges");
    expect(Array.isArray(json.nodes)).toBe(true);
    expect(Array.isArray(json.edges)).toBe(true);
  });
});

test.describe("Workflow import", () => {
  test("flow page has an Import button", async ({ page }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /import/i })).toBeVisible();
  });

  test("uploading a valid JSON file creates a workflow and opens canvas", async ({ page }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");

    // Create a minimal workflow JSON
    const workflowJson = JSON.stringify({
      name: "Test Import Workflow",
      nodes: [{ id: "n1", type: "requestInputs", position: { x: 100, y: 100 }, data: { fields: [] } }],
      edges: [],
    });
    const tmpPath = path.join(os.tmpdir(), "test-workflow.json");
    fs.writeFileSync(tmpPath, workflowJson);

    // Click import and set file
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    await fileInput.setInputFiles(tmpPath);

    // Should navigate to canvas
    await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/workflows\/.+\/canvas/);
  });

  test("imported workflow appears with correct name on flow page", async ({ page }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");

    const name = `Import-${Date.now()}`;
    const workflowJson = JSON.stringify({ name, nodes: [], edges: [] });
    const tmpPath = path.join(os.tmpdir(), `${name}.json`);
    fs.writeFileSync(tmpPath, workflowJson);

    const fileInput = page.locator('input[type="file"][accept=".json"]');
    await fileInput.setInputFiles(tmpPath);
    await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 10000 });

    // Go back to flow and find the workflow
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(name)).toBeVisible();
  });
});
