import { NextResponse } from "next/server";
import { getChildById } from "@/lib/admin-store";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`api:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await requireAuthApi(request);
    const child = await getChildById(id);
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }
    return NextResponse.json(child);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch child" }, { status: 500 });
  }
}


