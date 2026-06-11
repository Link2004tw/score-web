import { defineConfig } from "vitest/config";
import path from "path";
import { generateKeyPairSync } from "crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const TEST_PRIVATE_KEY = String(privateKey.export({ type: "pkcs8", format: "pem" }));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["./lib/__tests__/integration/*.test.ts"],
    exclude: ["node_modules/**"],
    setupFiles: ["./lib/__tests__/integration/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      FIRESTORE_EMULATOR_HOST: "localhost:8081",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9098",
      FIREBASE_ADMIN_PROJECT_ID: "test-project",
      FIREBASE_ADMIN_PRIVATE_KEY: TEST_PRIVATE_KEY,
      FIREBASE_ADMIN_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
      FIREBASE_ADMIN_PRIVATE_KEY_ID: "fake-key-id",
      FIREBASE_ADMIN_CLIENT_ID: "123456789",
      FIREBASE_ADMIN_AUTH_URI: "https://accounts.google.com/o/oauth2/auth",
      FIREBASE_ADMIN_TOKEN_URI: "https://oauth2.googleapis.com/token",
      FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL: "https://www.googleapis.com/oauth2/v1/certs",
      FIREBASE_ADMIN_CLIENT_X509_CERT_URL:
        "https://www.googleapis.com/robot/v1/metadata/x509/test@test-project.iam.gserviceaccount.com",
      FIREBASE_ADMIN_UNIVERSE_DOMAIN: "googleapis.com",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "test/empty-module.ts"),
    },
  },
});
