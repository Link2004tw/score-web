import { adminDb } from "./firebase-admin";
import type { Child, StoredChild, AttendanceSession, gradeValues } from "./schemas";
import { auditLog } from "./audit-log";

const SESSION_COLLECTION = "attendance-sessions";
const COLLECTION = "children";

export async function getAttendanceSession(
  date: string,
  type: "normal" | "choir",
): Promise<AttendanceSession | null> {
  const docId = `${date}_${type}`;
  const ref = adminDb.collection(SESSION_COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as AttendanceSession;
}

function fromAdminSnapshot(data: FirebaseFirestore.DocumentData, id: string): StoredChild {
  return {
    id,
    name: data.name as string,
    grade: data.grade as (typeof gradeValues)[number],
    gender: data.gender as "male" | "female",
    score: Number(data.score) || 0,
    normalAttendance: Number(data.normalAttendance) || 0,
    choirAttendance: Number(data.choirAttendance) || 0,
    choirMisses: Number(data.choirMisses) || 0,
    choirStatus: (data.choirStatus as "active" | "out") ?? "active",
    lastNormalDate: data.lastNormalDate as string | undefined,
    lastChoirDate: data.lastChoirDate as string | undefined,
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
  };
}

export async function addChild(child: Child): Promise<StoredChild> {
  const data = {
    ...child,
    createdAt: new Date().toISOString(),
  };
  const ref = await adminDb.collection(COLLECTION).add(data);
  auditLog({
    action: "addChild",
    targetId: ref.id,
    targetName: child.name,
    detail: child.name,
  });
  return fromAdminSnapshot({ ...data, id: ref.id }, ref.id);
}

export async function getChildren(opts?: {
  limit?: number;
  startAfterScore?: number;
  startAfterId?: string;
}): Promise<{ children: StoredChild[]; hasMore: boolean }> {
  const take = Math.min(opts?.limit ?? 50, 500);
  let query = adminDb
    .collection(COLLECTION)
    .orderBy("score", "desc")
    .orderBy("__name__", "desc")
    .limit(take + 1);

  if (opts?.startAfterScore !== undefined && opts?.startAfterId) {
    query = query.startAfter(opts.startAfterScore, opts.startAfterId);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, take);
  return {
    children: docs.map((d) => fromAdminSnapshot(d.data(), d.id)),
    hasMore: snapshot.docs.length > take,
  };
}

export async function getChildById(id: string): Promise<StoredChild | undefined> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return undefined;
  return fromAdminSnapshot(snapshot.data()!, snapshot.id);
}

export async function updateChild(id: string, updates: Partial<Child>): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(id);

  // Fetch name before update so we can store it in the audit log
  const before = await ref.get();
  const targetName = before.exists ? ((before.data()?.name as string) ?? undefined) : undefined;

  await ref.update(updates);
  const changed = Object.keys(updates).join(", ");
  auditLog({ action: "updateChild", targetId: id, targetName, detail: changed });
}

export async function deleteChild(id: string): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(id);

  // Fetch name before delete so we can store it in the audit log
  const before = await ref.get();
  const targetName = before.exists ? ((before.data()?.name as string) ?? undefined) : undefined;

  await ref.delete();
  auditLog({ action: "deleteChild", targetId: id, targetName });
}
