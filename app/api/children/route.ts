import { NextResponse } from "next/server";
import { getChildren } from "@/lib/admin-store";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`api:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await requireAuthApi(request);
    const children = await getChildren();
    return NextResponse.json(children);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/children error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
