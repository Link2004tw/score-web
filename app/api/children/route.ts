import { NextResponse } from "next/server";
import { getChildren } from "@/lib/admin-store";

export async function GET() {
  try {
    const children = await getChildren();
    return NextResponse.json(children);
  } catch (error) {
    console.error("GET /api/children error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
