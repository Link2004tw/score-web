import path from "path";
import fs from "fs";

export const AUTH_FILE = path.resolve(__dirname, "../playwright/.auth/user.json");

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
}

export function getTestUser(): TestUser {
  const raw = fs.readFileSync(AUTH_FILE, "utf-8");
  return JSON.parse(raw) as TestUser;
}

export const E2E_STUDENT_PREFIX = "E2E Test Student";

export function uniqueStudentName(): string {
  return `${E2E_STUDENT_PREFIX} ${Date.now()}`;
}

export const SELECTORS = {
  login: {
    email: "#email",
    password: "#password",
    submit: "button[type='submit']",
  },
  navbar: {
    leaderboard: 'header a[href="/leaderboard"]',
    add: 'header a[href="/create"]',
    score: 'header a[href="/score"]',
    attend: 'header a[href="/attendance"]',
    logout: "button:has-text('Logout')",
  },
};
