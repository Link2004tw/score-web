import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { getAttendanceSession } from "@/lib/admin-store";

export async function GET(request: NextRequest) {
  try {
    await requireAuthApi(request);

    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const type = searchParams.get("type");

    if (!date || !type || (type !== "normal" && type !== "choir")) {
      return NextResponse.json(
        { error: "date and type (normal|choir) query params required" },
        { status: 400 },
      );
    }

    const session = await getAttendanceSession(date, type);
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/attendance-sessions error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
