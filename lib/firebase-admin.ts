import admin from "firebase-admin";

function getServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const privateKeyId = process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const clientId = process.env.FIREBASE_ADMIN_CLIENT_ID;
  const authUri = process.env.FIREBASE_ADMIN_AUTH_URI;
  const tokenUri = process.env.FIREBASE_ADMIN_TOKEN_URI;
  const authProviderX509CertUrl = process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL;
  const clientX509CertUrl = process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL;
  const universeDomain = process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      "Missing required Firebase Admin environment variables.\n" +
        "Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL\n" +
        "Get these from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key."
    );
  }

  return {
    type: "service_account" as const,
    project_id: projectId,
    private_key_id: privateKeyId,
    private_key: privateKey.replace(/\\n/g, "\n"),
    client_email: clientEmail,
    client_id: clientId,
    auth_uri: authUri,
    token_uri: tokenUri,
    auth_provider_x509_cert_url: authProviderX509CertUrl,
    client_x509_cert_url: clientX509CertUrl,
    universe_domain: universeDomain || "googleapis.com",
  };
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

export const adminDb = admin.firestore();
