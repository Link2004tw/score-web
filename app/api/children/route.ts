import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getChildren } from "@/lib/admin-store";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`api:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await requireAuthApi(request);

    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 500);
    const startAfterScore = searchParams.get("score")
      ? Number(searchParams.get("score"))
      : undefined;
    const startAfterId = searchParams.get("id") || undefined;

    const result = await getChildren({ limit, startAfterScore, startAfterId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/children error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
