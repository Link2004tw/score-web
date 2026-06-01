import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";
import { adminRtdb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`api:logs:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await requireAuthApi(request);

    if (!adminRtdb) {
      return NextResponse.json({ error: "Realtime database not configured" }, { status: 500 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 500);

    // NOTE: RTDB requires indexes for `orderByChild(...)`.
    // To avoid runtime failures when indexes are not configured yet, we fetch a bounded set
    // (by key) and sort client-side (in-memory) by `timestamp`.
    const snapshot = await adminRtdb.ref("logs").limitToLast(limit).get();
    const raw = snapshot.val() as Record<string, unknown> | null;

    const logs = raw
      ? Object.entries(raw).map(([id, v]) => {
          const entry = v as Record<string, unknown>;
          return {
            id,
            action: entry.action,
            // normalize to simpler fields for the UI
            targetId: entry.targetId ?? entry.targetId,
            targetName: entry.targetName,
            detail: entry.detail,
            timestamp: entry.timestamp,
          };
        })
      : [];

    logs.sort((a, b) => {
      const at = Number(a.timestamp ?? 0);
      const bt = Number(b.timestamp ?? 0);
      return at - bt;
    });

    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/logs error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
