import { adminDb } from "./firebase-admin";
import type { Child, StoredChild, gradeValues } from "./schemas";
import { auditLog } from "./audit-log";

const COLLECTION = "children";

function fromAdminSnapshot(
  data: FirebaseFirestore.DocumentData,
  id: string
): StoredChild {
  return {
    id,
    name: data.name as string,
    grade: data.grade as (typeof gradeValues)[number],
    gender: data.gender as "male" | "female",
    score: Number(data.score) || 0,
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
  };
}

export async function addChild(child: Child): Promise<StoredChild> {
  const data = {
    ...child,
    createdAt: new Date().toISOString(),
  };
  const ref = await adminDb.collection(COLLECTION).add(data);
  auditLog({ action: "addChild", targetId: ref.id, detail: child.name });
  return fromAdminSnapshot({ ...data, id: ref.id }, ref.id);
}

export async function getChildren(): Promise<StoredChild[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .orderBy("score", "desc")
    .get();
  return snapshot.docs.map((d) => fromAdminSnapshot(d.data(), d.id));
}

export async function getChildById(
  id: string
): Promise<StoredChild | undefined> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return undefined;
  return fromAdminSnapshot(snapshot.data()!, snapshot.id);
}

export async function updateChild(
  id: string,
  updates: Partial<Child>
): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  await ref.update(updates);
  const changed = Object.keys(updates).join(", ");
  auditLog({ action: "updateChild", targetId: id, detail: changed });
}

export async function deleteChild(id: string): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  await ref.delete();
  auditLog({ action: "deleteChild", targetId: id });
}
