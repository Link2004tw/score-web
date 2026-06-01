import admin from "firebase-admin";
import { env } from "@/lib/env";

const serviceAccount = {
  type: "service_account" as const,
  project_id: env.admin.projectId,
  private_key_id: env.admin.privateKeyId,
  private_key: env.admin.privateKey.replace(/\\n/g, "\n"),
  client_email: env.admin.clientEmail,
  client_id: env.admin.clientId,
  auth_uri: env.admin.authUri,
  token_uri: env.admin.tokenUri,
  auth_provider_x509_cert_url: env.admin.authProviderX509CertUrl,
  client_x509_cert_url: env.admin.clientX509CertUrl,
  universe_domain: env.admin.universeDomain,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const adminDb = admin.firestore();
