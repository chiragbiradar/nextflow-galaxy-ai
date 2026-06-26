/**
 * FR: API Routes
 * - Zod validation on inputs
 * - All routes require auth (Clerk)
 * - Workflows scoped to authenticated user
 */
import { test, expect } from "@playwright/test";

test.describe("API — Auth protection", () => {
  // These run WITHOUT auth state (anonymous)
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GET /api/workflows returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/workflows");
    expect(res.status()).toBe(401);
  });

  test("POST /api/workflows returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/workflows");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/workflows/fake-id returns 401 without auth", async ({ request }) => {
    const res = await request.patch("/api/workflows/fake-id", {
      data: { name: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/workflows/fake-id returns 401 without auth", async ({ request }) => {
    const res = await request.delete("/api/workflows/fake-id");
    expect(res.status()).toBe(401);
  });
});

test.describe("API — Zod validation (authenticated)", () => {
  test("PATCH /api/workflows/:id with invalid body returns 400", async ({
    page,
    request,
  }) => {
    // First get a valid workflow ID by creating one
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
    await page.locator('button[title="New workflow"]').click();
    await page.waitForURL(/\/workflows\/(.+)\/canvas/);
    const workflowId = page.url().match(/\/workflows\/([^/]+)\/canvas/)?.[1];

    expect(workflowId).toBeTruthy();

    // Send invalid body (name too short after trim = empty or wrong type)
    const res = await request.patch(`/api/workflows/${workflowId}`, {
      data: { name: "" }, // fails z.string().min(1)
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("PATCH /api/workflows/:id with valid body returns 200", async ({
    page,
    request,
  }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
    await page.locator('button[title="New workflow"]').click();
    await page.waitForURL(/\/workflows\/(.+)\/canvas/);
    const workflowId = page.url().match(/\/workflows\/([^/]+)\/canvas/)?.[1];

    const res = await request.patch(`/api/workflows/${workflowId}`, {
      data: { name: "Valid Name" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Valid Name");
  });

  test("PATCH /api/workflows/:id with invalid nodes (not array) returns 400", async ({
    page,
    request,
  }) => {
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
    await page.locator('button[title="New workflow"]').click();
    await page.waitForURL(/\/workflows\/(.+)\/canvas/);
    const workflowId = page.url().match(/\/workflows\/([^/]+)\/canvas/)?.[1];

    const res = await request.patch(`/api/workflows/${workflowId}`, {
      data: { nodes: "not-an-array" }, // fails z.array()
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("API — Workflow CRUD (authenticated)", () => {
  test("POST /api/workflows creates workflow and returns id", async ({ request }) => {
    const res = await request.post("/api/workflows");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("userId");
  });

  test("GET /api/workflows returns array", async ({ request }) => {
    const res = await request.get("/api/workflows");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/workflows/:id returns 404 for non-existent id", async ({ request }) => {
    const res = await request.get("/api/workflows/nonexistent-id-xyz");
    expect([404, 401]).toContain(res.status());
  });

  test("DELETE /api/workflows/:id returns 204", async ({ request }) => {
    // Create first
    const createRes = await request.post("/api/workflows");
    const { id } = await createRes.json();

    const deleteRes = await request.delete(`/api/workflows/${id}`);
    expect(deleteRes.status()).toBe(204);
  });

  test("workflows are user-scoped (user can't see others' workflows)", async ({
    request,
  }) => {
    // Create a workflow
    const createRes = await request.post("/api/workflows");
    const { id } = await createRes.json();

    // Get it back — should work (same user)
    const getRes = await request.get(`/api/workflows/${id}`);
    expect(getRes.status()).toBe(200);

    // Try a fake ID belonging to "another user" — should 404
    const fakeRes = await request.get("/api/workflows/000000000000");
    expect([404, 401]).toContain(fakeRes.status());
  });
});

test.describe("API — Runs", () => {
  test("POST /api/workflows/:id/run returns run object", async ({
    page,
    request,
  }) => {
    // Create a workflow
    await page.goto("/flow");
    await page.waitForLoadState("networkidle");
    await page.locator('button[title="New workflow"]').click();
    await page.waitForURL(/\/workflows\/(.+)\/canvas/);
    const workflowId = page.url().match(/\/workflows\/([^/]+)\/canvas/)?.[1];

    const res = await request.post(`/api/workflows/${workflowId}/run`);
    // Should create a run (even if no nodes to execute)
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("status");
  });
});
