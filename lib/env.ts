import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Check your .env or Vercel environment variables.`,
    );
  }
  return value;
}

export const env = {
  admin: {
    projectId: required("FIREBASE_ADMIN_PROJECT_ID", process.env.FIREBASE_ADMIN_PROJECT_ID),
    privateKey: required("FIREBASE_ADMIN_PRIVATE_KEY", process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    clientEmail: required("FIREBASE_ADMIN_CLIENT_EMAIL", process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
    privateKeyId: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID ?? "",
    clientId: process.env.FIREBASE_ADMIN_CLIENT_ID ?? "",
    authUri: process.env.FIREBASE_ADMIN_AUTH_URI ?? "",
    tokenUri: process.env.FIREBASE_ADMIN_TOKEN_URI ?? "",
    authProviderX509CertUrl: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL ?? "",
    clientX509CertUrl: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL ?? "",
    universeDomain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || "googleapis.com",
  },
};
