"use server";

// NOTE: Avoid using next/headers in this module (client/Pages-router safety)
// import { headers } from "next/headers";
import { addChild, updateChild, deleteChild, getChildById } from "@/lib/admin-store";
import type { Child, AttendanceType } from "@/lib/schemas";
import { getLastWednesdayDate } from "@/lib/attendance-utils";
import { requireAuth, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";

function getRateLimitIp(ip?: string) {
  return ip ?? "unknown";
}

async function checkRateLimit(ip?: string) {
  const safeIp = getRateLimitIp(ip);
  const { success } = rateLimit(`action:${safeIp}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!success) throw new Error("Too many requests. Please slow down.");
}

export async function addChildAction(data: Child, ip?: string) {
  await requireAuth();
  await checkRateLimit(ip);
  return await addChild(data);
}

export async function deleteChildAction(id: string, ip?: string) {
  await requireAuth();
  await checkRateLimit(ip);
  await deleteChild(id);
}

export async function updateChildAction(id: string, data: Partial<Child>, ip?: string) {
  await requireAuth();
  await checkRateLimit(ip);
  await updateChild(id, data);
}

export async function adjustScoreAction(
  id: string,
  delta: number,
): Promise<{ score: number } | { error: string }> {
  try {
    await requireAuth();
    await checkRateLimit();

    const child = await getChildById(id);
    if (!child) return { error: "Student not found" };

    const oldScore = Number(child.score);
    const newScore = Math.max(0, oldScore + delta);

    // We intentionally only log the high-level score adjustment.
    // `updateChild()` already calls auditLog("updateChild"), which is why we avoid
    // using it here.

    const ref = (await import("@/lib/firebase-admin")).adminDb.collection("children").doc(id);

    await ref.update({ score: newScore });

    auditLog({
      action: "adjustScore",
      targetId: id,
      // store name in the log so the logs UI can display it
      targetName: child.name,
      detail: `delta=${delta} oldScore=${oldScore} newScore=${newScore}`,
    });

    return { score: newScore };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Error && e.message === "Too many requests. Please slow down.")
      return { error: e.message };
    console.error("adjustScoreAction error:", e);
    return { error: e instanceof Error ? e.message : "Failed to update score" };
  }
}

export async function markAttendanceAction(
  id: string,
  type: AttendanceType,
): Promise<{ count: number; action: "marked" | "unmarked" } | { error: string }> {
  try {
    await requireAuth();
    await checkRateLimit();

    const child = await getChildById(id);
    if (!child) return { error: "Student not found" };

    const today = getLastWednesdayDate();
    const { FieldValue } = await import("firebase-admin/firestore");
    const { adminDb } = await import("@/lib/firebase-admin");
    const ref = adminDb.collection("children").doc(id);
    const sessionRef = adminDb.collection("attendance-sessions").doc(`${today}_${type}`);
    const metaRef = adminDb.collection("_meta").doc("attendance");

    const sessionBase = { date: today, type };

    if (type === "normal") {
      if (child.lastNormalDate === today) {
        await Promise.all([
          ref.update({
            normalAttendance: FieldValue.increment(-1),
            lastNormalDate: FieldValue.delete(),
          }),
          sessionRef.update({
            [`attendees.${id}`]: FieldValue.delete(),
            count: FieldValue.increment(-1),
          }),
        ]);
        auditLog({ action: "unmarkNormalAttendance", targetId: id, targetName: child.name });
        return { count: Math.max(0, (child.normalAttendance || 0) - 1), action: "unmarked" };
      }
      await Promise.all([
        ref.update({
          normalAttendance: FieldValue.increment(1),
          lastNormalDate: today,
        }),
        sessionRef.set(
          { ...sessionBase, attendees: { [id]: child.name }, count: FieldValue.increment(1) },
          { merge: true },
        ),
      ]);
      auditLog({ action: "markNormalAttendance", targetId: id, targetName: child.name });
      return { count: (child.normalAttendance || 0) + 1, action: "marked" };
    }

    // Choir unmark
    if (child.lastChoirDate === today) {
      await Promise.all([
        ref.update({
          choirAttendance: FieldValue.increment(-1),
          lastChoirDate: FieldValue.delete(),
        }),
        sessionRef.update({
          [`attendees.${id}`]: FieldValue.delete(),
          count: FieldValue.increment(-1),
        }),
      ]);
      auditLog({ action: "unmarkChoirAttendance", targetId: id, targetName: child.name });
      return { count: Math.max(0, (child.choirAttendance || 0) - 1), action: "unmarked" };
    }

    const updates: Record<string, unknown> = {
      choirAttendance: FieldValue.increment(1),
      lastChoirDate: today,
    };

    const metaSnap = await metaRef.get();
    if (metaSnap.exists && metaSnap.data()?.lastChoirFinalize === today) {
      const newMisses = Math.max(0, (child.choirMisses || 0) - 1);
      updates.choirMisses = newMisses;
      if (newMisses < 3 && child.choirStatus === "out") {
        updates.choirStatus = "active";
      }
    }

    await ref.update(updates);
    await sessionRef.set(
      { ...sessionBase, attendees: { [id]: child.name }, count: FieldValue.increment(1) },
      { merge: true },
    );
    auditLog({ action: "markChoirAttendance", targetId: id, targetName: child.name });
    return { count: (child.choirAttendance || 0) + 1, action: "marked" };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Error && e.message === "Too many requests. Please slow down.")
      return { error: e.message };
    console.error("markAttendanceAction error:", e);
    return { error: e instanceof Error ? e.message : "Failed to mark attendance" };
  }
}

export async function markAllAttendanceAction(
  ids: string[],
  type: AttendanceType,
): Promise<{ marked: number; errors: number } | { error: string }> {
  try {
    await requireAuth();
    await checkRateLimit();

    const today = getLastWednesdayDate();
    const { FieldValue } = await import("firebase-admin/firestore");
    const { adminDb } = await import("@/lib/firebase-admin");
    const attendees: Record<string, string> = {};
    const batch = adminDb.batch();
    let marked = 0;

    for (const id of ids) {
      const ref = adminDb.collection("children").doc(id);
      const snap = await ref.get();
      if (!snap.exists) continue;

      const child = snap.data()!;
      const lastDate = type === "normal" ? child.lastNormalDate : child.lastChoirDate;
      if (lastDate === today) continue;

      if (type === "normal") {
        batch.update(ref, {
          normalAttendance: FieldValue.increment(1),
          lastNormalDate: today,
        });
      } else {
        batch.update(ref, {
          choirAttendance: FieldValue.increment(1),
          lastChoirDate: today,
        });
      }

      attendees[id] = child.name as string;
      marked++;
    }

    if (marked === 0) return { marked: 0, errors: 0 };

    const sessionRef = adminDb.collection("attendance-sessions").doc(`${today}_${type}`);
    batch.set(
      sessionRef,
      { date: today, type, attendees, count: FieldValue.increment(marked) },
      { merge: true },
    );

    await batch.commit();

    auditLog({
      action: `markAll${type === "normal" ? "Normal" : "Choir"}Attendance`,
      detail: `${marked} students marked`,
    });

    return { marked, errors: 0 };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Error && e.message === "Too many requests. Please slow down.")
      return { error: e.message };
    console.error("markAllAttendanceAction error:", e);
    return { error: e instanceof Error ? e.message : "Failed to mark attendance" };
  }
}

export async function finalizeChoirSessionAction(): Promise<
  { processed: number; markedOut: number } | { error: string }
> {
  try {
    await requireAuth();
    await checkRateLimit();

    const today = getLastWednesdayDate();
    const { FieldValue } = await import("firebase-admin/firestore");
    const { adminDb } = await import("@/lib/firebase-admin");

    const metaRef = adminDb.collection("_meta").doc("attendance");
    const metaSnap = await metaRef.get();
    if (metaSnap.exists && metaSnap.data()?.lastChoirFinalize === today) {
      return { error: "Choir session already finalized for today" };
    }

    const snapshot = await adminDb.collection("children").get();
    if (snapshot.empty) {
      return { error: "No students found" };
    }

    const batch = adminDb.batch();
    let processed = 0;
    let markedOut = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lastChoirDate === today) return;

      const currentMisses = Number(data.choirMisses) || 0;
      const newMisses = currentMisses + 1;
      const newStatus = newMisses >= 3 ? "out" : (data.choirStatus ?? "active");

      batch.update(doc.ref, {
        choirMisses: newMisses,
        choirStatus: newStatus,
      });
      processed++;
      if (newStatus === "out") markedOut++;
    });

    batch.set(metaRef, { lastChoirFinalize: today }, { merge: true });
    await batch.commit();

    auditLog({
      action: "finalizeChoirSession",
      detail: `${processed} absences processed, ${markedOut} students marked out`,
    });

    return { processed, markedOut };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Error && e.message === "Too many requests. Please slow down.")
      return { error: e.message };
    console.error("finalizeChoirSessionAction error:", e);
    return { error: e instanceof Error ? e.message : "Failed to finalize choir session" };
  }
}
