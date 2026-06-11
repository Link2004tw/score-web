import { afterAll } from "vitest";
import { adminDb } from "@/lib/firebase-admin";

async function wipeCollection(collection: string) {
  const snapshot = await adminDb.collection(collection).get();
  if (snapshot.size > 0) {
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

afterAll(async () => {
  await wipeCollection("children");
  await wipeCollection("attendance-sessions");
});
