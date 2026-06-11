import admin from "firebase-admin";
import path from "path";
import fs from "fs";

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const TEST_USER_EMAIL = "e2e-test@score-web.local";
const TEST_USER_PASSWORD = "E2eTestPass123!";
const TEST_USER_DISPLAY_NAME = "E2E Test User";

const AUTH_FILE = path.resolve(__dirname, "../playwright/.auth/user.json");

export default async function globalSetup() {
  loadEnv();

  const FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const FIREBASE_ADMIN_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const FIREBASE_ADMIN_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_ADMIN_CLIENT_EMAIL) {
    console.log("Skipping E2E global setup: Firebase Admin env vars not set");
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_ADMIN_PROJECT_ID,
        privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
      } as admin.ServiceAccount),
    });
  }

  try {
    await admin.auth().getUserByEmail(TEST_USER_EMAIL);
  } catch {
    await admin.auth().createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      displayName: TEST_USER_DISPLAY_NAME,
    });
  }

  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      displayName: TEST_USER_DISPLAY_NAME,
    }),
    "utf-8",
  );
}
