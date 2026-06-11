import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import type { TestUser } from "./test-utils";

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

const AUTH_FILE = path.resolve(__dirname, "../playwright/.auth/user.json");

export default async function globalTeardown() {
  loadEnv();

  const FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const FIREBASE_ADMIN_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const FIREBASE_ADMIN_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_ADMIN_CLIENT_EMAIL) {
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

  let testUser: TestUser;
  try {
    const raw = fs.readFileSync(AUTH_FILE, "utf-8");
    testUser = JSON.parse(raw) as TestUser;
  } catch {
    return;
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(testUser.email);
    await admin.auth().deleteUser(userRecord.uid);
  } catch {
    // user may not exist — ignore
  }

  try {
    const snapshot = await admin
      .firestore()
      .collection("children")
      .where("name", ">=", "E2E Test Student")
      .where("name", "<", "E2E Test Studenf")
      .get();

    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } catch {
    // may fail if index doesn't exist — ignore
  }

  try {
    fs.unlinkSync(AUTH_FILE);
  } catch {
    // ignore
  }
}
