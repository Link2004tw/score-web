import { test, expect } from "@playwright/test";
import { getTestUser, uniqueStudentName, SELECTORS } from "./test-utils";

test.describe("complete user journey", () => {
  let studentName: string;

  test.beforeAll(() => {
    studentName = uniqueStudentName();
  });

  test("login, create student, adjust score, view leaderboard, detail, delete, logout", async ({
    page,
  }) => {
    const user = getTestUser();

    // Step 1: Login via UI
    await page.goto("/login");
    await page.fill(SELECTORS.login.email, user.email);
    await page.fill(SELECTORS.login.password, user.password);
    await page.click(SELECTORS.login.submit);
    await page.waitForURL("/leaderboard");
    await expect(page.locator("text=All Students")).toBeVisible({ timeout: 10000 });

    // Verify fb_token cookie was set
    const cookies = await page.context().cookies();
    const fbCookie = cookies.find((c) => c.name === "fb_token");
    expect(fbCookie).toBeDefined();

    // Step 2: Create a new student
    await page.click(SELECTORS.navbar.add);
    await page.waitForURL("/create");
    await page.fill("#name", studentName);
    await page.selectOption("#grade", "kg1");
    await page.selectOption("#gender", "male");
    await page.fill("#score", "10");
    await page.click("button[type='submit']");

    // Wait for navigation by checking that h1 with student name appears
    await expect(page.locator("h1")).toContainText(studentName, { timeout: 10000 });
    const childId = page.url().split("/").pop()!;

    // Step 3: Navigate to score page, adjust score (+1)
    await page.click(SELECTORS.navbar.score);
    await page.waitForURL("/score");
    await page.fill("input[placeholder='Search students...']", studentName);
    await page
      .locator("text=" + studentName)
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await page.locator("button:has-text('+')").first().click();
    await page.waitForTimeout(1000);

    // Step 4: Navigate to leaderboard and verify the student appears
    await page.click(SELECTORS.navbar.leaderboard);
    await page.waitForURL("/leaderboard");
    await page.fill("input[placeholder='Search by name...']", studentName);
    await expect(page.locator("table")).toContainText(studentName, { timeout: 10000 });

    // Step 5: Navigate to detail page via leaderboard student link
    await page.click(`a[href="/${childId}"]`);
    await page.waitForURL(`/${childId}`);
    await expect(page.locator("h1")).toContainText(studentName, { timeout: 15000 });

    // Step 6: Delete the student
    await page.click("button:has-text('Delete')");
    await page
      .locator("[role='dialog'] button:has-text('Delete'):not(:has-text('Cancel'))")
      .click();
    await page.waitForURL("/leaderboard");

    // Step 7: Verify student no longer appears on leaderboard
    // (after deleting the only student, the table is not rendered, so check body text)
    await page.fill("input[placeholder='Search by name...']", studentName);
    await expect(page.locator("body")).not.toContainText(studentName);

    // Step 8: Logout
    await page.click("button:has-text('Logout')");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");

    // Step 9: Verify protected routes still redirect after logout
    await page.goto("/leaderboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
