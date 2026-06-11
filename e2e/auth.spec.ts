import { test, expect } from "@playwright/test";

test.describe("unauthenticated access", () => {
  const protectedPages = [
    { path: "/leaderboard", name: "leaderboard" },
    { path: "/create", name: "create" },
    { path: "/score", name: "score" },
    { path: "/attendance", name: "attendance" },
  ];

  for (const { path, name } of protectedPages) {
    test(`redirects to /login when accessing /${name} without auth`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain("/login");
    });
  }

  test("returns 401 for GET /api/children without auth", async ({ page }) => {
    const response = await page.goto("/api/children?limit=10");
    expect(response?.status()).toBe(401);
    const body = await response?.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("returns 401 for GET /api/children/:id without auth", async ({ page }) => {
    const response = await page.goto("/api/children/nonexistent-id");
    expect(response?.status()).toBe(401);
    const body = await response?.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
