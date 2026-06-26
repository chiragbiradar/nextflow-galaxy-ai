/**
 * FR: All 4 Node Types
 *
 * Request-Inputs — pre-placed, + to add text/image fields, rename, output handle per field
 * Crop Image     — X/Y/W/H (0-100, defaults 0/0/100/100), FFmpeg via Trigger.dev, 30s+
 * Gemini 3.1 Pro — model selector, System Prompt, Image(Vision) input, inline Response
 * Response       — single input handle, no output handle
 */
import { test, expect, type Page } from "@playwright/test";

async function openFreshCanvas(page: Page) {
  await page.goto("/flow");
  await page.waitForLoadState("networkidle");
  await page.locator('button[title="New workflow"]').click();
  await page.waitForURL(/\/workflows\/.+\/canvas/, { timeout: 15_000 });
  await page.waitForSelector(".react-flow__node", { timeout: 10_000 });
}

// ── Request-Inputs ─────────────────────────────────────────────────────────

test.describe("Request-Inputs Node", () => {
  test.beforeEach(async ({ page }) => {
    await openFreshCanvas(page);
  });

  test("Request-Inputs node exists on canvas", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await expect(node).toBeVisible();
  });

  test("Request-Inputs has + Add Text button when empty", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await expect(node.getByText("Text")).toBeVisible();
  });

  test("Request-Inputs has + Add Image button when empty", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await expect(node.getByText("Image")).toBeVisible();
  });

  test("clicking Text adds a text_field", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await node.getByText("Text").click();
    // Should show a textarea
    await expect(node.locator("textarea")).toBeVisible();
    // Field name defaults to text_field
    await expect(node.locator("input[value='text_field']")).toBeVisible();
  });

  test("clicking Image adds an image_field", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await node.getByText("Image").click();
    await expect(node.locator("input[value='image_field']")).toBeVisible();
    // Upload area visible
    await expect(node.getByText(/upload image/i)).toBeVisible();
  });

  test("field name is renameable", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await node.getByText("Text").click();
    const nameInput = node.locator("input[value='text_field']");
    await nameInput.fill("my_custom_field");
    await expect(nameInput).toHaveValue("my_custom_field");
  });

  test("multiple fields can be added", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    // Use the + button in the header
    const addBtn = node.locator('button[title="Add field"]');
    await addBtn.click();
    await addBtn.click();
    const textareas = node.locator("textarea");
    await expect(textareas).toHaveCount(2);
  });

  test("field can be deleted", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await node.getByText("Text").click();
    await expect(node.locator("textarea")).toHaveCount(1);
    // Hover to reveal delete
    await node.locator("textarea").hover();
    await node.locator("button").filter({ has: page.locator("svg") }).last().click();
    await expect(node.locator("textarea")).toHaveCount(0);
  });

  test("Request-Inputs cannot be deleted from canvas", async ({ page }) => {
    // Click node to select it
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await node.click();
    // Press Delete/Backspace — should NOT remove the node
    await page.keyboard.press("Delete");
    await expect(node).toBeVisible();
    // Still 2 nodes total
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
  });

  // ── FR GAP: Transloadit image upload ─────────────────────────────────────
  test.fail("MISSING: image_field has Transloadit upload (not just placeholder)", async ({
    page,
  }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Request-Inputs" });
    await node.getByText("Image").click();
    // Should have actual file input wired to Transloadit
    await expect(node.locator("input[type=file]")).toBeVisible();
  });
});

// ── Crop Image ─────────────────────────────────────────────────────────────

test.describe("Crop Image Node", () => {
  test.beforeEach(async ({ page }) => {
    await openFreshCanvas(page);
    // Add Crop Image node
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Crop Image/i).click();
    await page.waitForSelector(".react-flow__node:has-text('Crop Image')", {
      timeout: 5_000,
    });
  });

  test("Crop Image node appears with correct title", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    await expect(node).toBeVisible();
  });

  test("X Position input defaults to 0", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    const xInput = node.locator("input[type=number]").nth(0);
    await expect(xInput).toHaveValue("0");
  });

  test("Y Position input defaults to 0", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    const yInput = node.locator("input[type=number]").nth(1);
    await expect(yInput).toHaveValue("0");
  });

  test("Width input defaults to 100", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    const wInput = node.locator("input[type=number]").nth(2);
    await expect(wInput).toHaveValue("100");
  });

  test("Height input defaults to 100", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    const hInput = node.locator("input[type=number]").nth(3);
    await expect(hInput).toHaveValue("100");
  });

  test("X/Y/W/H are editable (0–100 range)", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    const xInput = node.locator("input[type=number]").nth(0);
    await xInput.fill("20");
    await expect(xInput).toHaveValue("20");
    const wInput = node.locator("input[type=number]").nth(2);
    await wInput.fill("60");
    await expect(wInput).toHaveValue("60");
  });

  test("node shows 30s+ badge indicating mandatory delay", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    await expect(node.getByText(/30s/i)).toBeVisible();
  });

  test("Crop Image node has an input (target) handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    await expect(node.locator(".react-flow__handle-left")).toBeVisible();
  });

  test("Crop Image node has an output (source) handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    await expect(node.locator(".react-flow__handle-right")).toBeVisible();
  });

  test("Crop Image node label is renameable", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Crop Image" });
    const labelInput = node.locator("input[type=text]").first();
    await labelInput.fill("Crop Image #1");
    await expect(labelInput).toHaveValue("Crop Image #1");
  });
});

// ── Gemini Node ────────────────────────────────────────────────────────────

test.describe("Gemini Node", () => {
  test.beforeEach(async ({ page }) => {
    await openFreshCanvas(page);
    await page.locator('button[title="Add node"]').click();
    await page.getByText(/Gemini/i).click();
    await page.waitForSelector(".react-flow__node:has-text('LLM')", { timeout: 5_000 });
  });

  test("Gemini node appears on canvas", async ({ page }) => {
    const node = page
      .locator(".react-flow__node")
      .filter({ hasText: /LLM|Gemini/i });
    await expect(node).toBeVisible();
  });

  test("Gemini node has System Prompt textarea", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    await expect(node.locator("textarea")).toBeVisible();
  });

  test("System Prompt is editable", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    const sysPrompt = node.locator("textarea");
    await sysPrompt.fill("You are a helpful assistant.");
    await expect(sysPrompt).toHaveValue("You are a helpful assistant.");
  });

  test("Settings section expands to show model selector", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    await node.getByText("Settings").click();
    await expect(node.locator("select")).toBeVisible({ timeout: 3_000 });
  });

  test("model selector includes Gemini models", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    await node.getByText("Settings").click();
    const select = node.locator("select");
    const options = await select.locator("option").allTextContents();
    expect(options.some((o) => o.includes("gemini"))).toBe(true);
  });

  test("Gemini node has input (target) handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    await expect(node.locator(".react-flow__handle-left")).toBeVisible();
  });

  test("Gemini node has output (source) handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    await expect(node.locator(".react-flow__handle-right")).toBeVisible();
  });

  test("Gemini node label is renameable", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    const labelInput = node.locator("input[type=text]").first();
    await labelInput.fill("Gemini #1");
    await expect(labelInput).toHaveValue("Gemini #1");
  });

  test("Response section shows 'No output yet' before run", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    await expect(node.getByText(/no output yet/i)).toBeVisible();
  });

  // ── FR GAP: Image (Vision) handle ────────────────────────────────────────
  test.fail("MISSING: Gemini node has Image (Vision) input handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    // Should have a labeled Vision handle
    await expect(node.getByText(/vision|image/i)).toBeVisible();
  });

  // ── FR GAP: Prompt connection handle ─────────────────────────────────────
  test.fail("MISSING: Gemini Prompt has a connection handle (not just disabled textarea)", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: /LLM|Gemini/i });
    // Prompt row should have a target handle so upstream can wire into it
    const promptHandle = node.locator(".react-flow__handle[data-handleid='prompt']");
    await expect(promptHandle).toBeVisible();
  });
});

// ── Response Node ──────────────────────────────────────────────────────────

test.describe("Response Node", () => {
  test.beforeEach(async ({ page }) => {
    await openFreshCanvas(page);
  });

  test("Response node is pre-placed on canvas", async ({ page }) => {
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Response" })
    ).toBeVisible();
  });

  test("Response node has a target (input) handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Response" });
    await expect(node.locator(".react-flow__handle-left")).toBeVisible();
  });

  test("Response node has NO source (output) handle", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Response" });
    await expect(node.locator(".react-flow__handle-right")).toHaveCount(0);
  });

  test("Response node cannot be deleted", async ({ page }) => {
    const node = page.locator(".react-flow__node").filter({ hasText: "Response" });
    await node.click();
    await page.keyboard.press("Delete");
    await expect(node).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
  });
});
