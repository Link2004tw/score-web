"use server";

import { addChild, updateChild, deleteChild, getChildById } from "@/lib/store";
import type { Child } from "@/lib/schemas";

export async function addChildAction(data: Child) {
  return await addChild(data);
}

export async function updateChildAction(id: string, data: Partial<Child>) {
  await updateChild(id, data);
}

export async function deleteChildAction(id: string) {
  await deleteChild(id);
}

export async function adjustScoreAction(id: string, delta: number): Promise<{ score: number } | { error: string }> {
  try {
    console.log("adjustScoreAction called:", { id, delta });
    const child = await getChildById(id);
    console.log("getChildById result:", child);
    if (!child) return { error: "Student not found" };
    const newScore = Math.max(0, Number(child.score) + delta);
    console.log("Updating score to:", newScore);
    await updateChild(id, { score: String(newScore) });
    console.log("Score updated successfully");
    return { score: newScore };
  } catch (e) {
    console.error("adjustScoreAction error:", e);
    return { error: e instanceof Error ? e.message : "Failed to update score" };
  }
}
