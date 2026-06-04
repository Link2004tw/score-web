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
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const actionFilter = url.searchParams.get("action") ?? null;

    // RTDB stores logs under `logs/<pushId>`.
    // Without RTDB indexes for `orderByChild(timestamp)`, we can't reliably fetch “page N” efficiently.
    // To keep pagination correct (newest-first), we fetch up to (page * limit) newest records (bounded),
    // then sort/filter in memory, and finally slice for the requested page.
    const maxFetch = 5000; // hard cap to avoid huge reads on large page numbers
    const fetchCount = Math.min(page * limit, maxFetch);

    const snapshot = await adminRtdb.ref("logs").limitToLast(fetchCount).get();
    const raw = snapshot.val() as Record<string, unknown> | null;

    let logs = raw
      ? Object.entries(raw).map(([id, v]) => {
          const entry = v as Record<string, unknown>;
          return {
            id,
            action: entry.action,
            // normalize to simpler fields for the UI
            targetId: (entry.targetId as string | undefined) ?? undefined,
            targetName: entry.targetName,
            actorDisplayName: entry.actorDisplayName,
            detail: entry.detail,
            timestamp: entry.timestamp,
          };
        })
      : [];

    logs.sort((a, b) => {
      const at = typeof a.timestamp === "string" ? new Date(a.timestamp).getTime() : 0;
      const bt = typeof b.timestamp === "string" ? new Date(b.timestamp).getTime() : 0;
      // newest -> oldest
      return bt - at;
    });

    if (actionFilter && actionFilter !== "all") {
      logs = logs.filter((l) => l.action === actionFilter);
    }

    const start = (page - 1) * limit;
    const paged = logs.slice(start, start + limit);
    const hasNext = start + limit < logs.length;

    return NextResponse.json({ logs: paged, page, limit, hasNext });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/logs error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
