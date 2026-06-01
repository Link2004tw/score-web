import { NextResponse } from "next/server";
import { getChildById } from "@/lib/admin-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const child = await getChildById(id);
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }
    return NextResponse.json(child);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch child" }, { status: 500 });
  }
}


