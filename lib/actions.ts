"use server";

import { headers } from "next/headers";
import { addChild, updateChild, deleteChild, getChildById } from "@/lib/admin-store";
import type { Child } from "@/lib/schemas";
import { requireAuth, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";

async function checkRateLimit() {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`action:${ip}`, { maxRequests: 30, windowMs: 60_000 });
  if (!success) throw new Error("Too many requests. Please slow down.");
}

export async function addChildAction(data: Child) {
  await requireAuth();
  await checkRateLimit();
  return await addChild(data);
}

export async function deleteChildAction(id: string) {
  await requireAuth();
  await checkRateLimit();
  await deleteChild(id);
}

export async function updateChildAction(id: string, data: Partial<Child>) {
  await requireAuth();
  await checkRateLimit();
  await updateChild(id, data);
}

export async function adjustScoreAction(id: string, delta: number): Promise<{ score: number } | { error: string }> {
  try {
    await requireAuth();
    await checkRateLimit();
    const child = await getChildById(id);
    if (!child) return { error: "Student not found" };
    const newScore = Math.max(0, Number(child.score) + delta);
    await updateChild(id, { score: newScore });
    return { score: newScore };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Error && e.message === "Too many requests. Please slow down.") return { error: e.message };
    console.error("adjustScoreAction error:", e);
    return { error: e instanceof Error ? e.message : "Failed to update score" };
  }
}
