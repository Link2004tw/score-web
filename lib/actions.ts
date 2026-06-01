"use server";

// NOTE: Avoid using next/headers in this module (client/Pages-router safety)
// import { headers } from "next/headers";
import { addChild, updateChild, deleteChild, getChildById } from "@/lib/admin-store";
import type { Child } from "@/lib/schemas";
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
