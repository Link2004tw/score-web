import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getLastWednesdayDate, getAllWednesdaysInRange } from "@/lib/attendance-utils";
import type { AttendanceSession, StoredChild } from "@/lib/schemas";

function fromAdminSnapshot(data: FirebaseFirestore.DocumentData, id: string): StoredChild {
  return {
    id,
    name: data.name as string,
    grade: data.grade as StoredChild["grade"],
    gender: data.gender as "male" | "female",
    score: Number(data.score) || 0,
    normalAttendance: Number(data.normalAttendance) || 0,
    choirAttendance: Number(data.choirAttendance) || 0,
    choirMisses: Number(data.choirMisses) || 0,
    choirStatus: (data.choirStatus as "active" | "out") ?? "active",
    lastNormalDate: data.lastNormalDate as string | undefined,
    lastChoirDate: data.lastChoirDate as string | undefined,
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`api:${ip}`, {
      maxRequests: 60,
      windowMs: 60_000,
    });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await requireAuthApi(request);

    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");

    if (!from) {
      return NextResponse.json(
        { error: "from query param required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const parsedFrom = new Date(from + "T00:00:00");
    if (parsedFrom.getDay() !== 3) {
      return NextResponse.json({ error: "from date must be a Wednesday" }, { status: 400 });
    }

    const to = getLastWednesdayDate();
    const weeks = getAllWednesdaysInRange(from, to);

    const sessionPromises = weeks.flatMap((date) => [
      adminDb
        .collection("attendance-sessions")
        .doc(`${date}_normal`)
        .get()
        .then((snap) => ({ date, type: "normal" as const, snap })),
      adminDb
        .collection("attendance-sessions")
        .doc(`${date}_choir`)
        .get()
        .then((snap) => ({ date, type: "choir" as const, snap })),
    ]);

    const results = await Promise.all(sessionPromises);

    const sessions: Record<string, { normal?: AttendanceSession; choir?: AttendanceSession }> = {};
    for (const { date, type, snap } of results) {
      if (!snap.exists) continue;
      sessions[date] = sessions[date] || {};
      sessions[date][type] = snap.data() as AttendanceSession;
    }

    const childrenSnap = await adminDb
      .collection("children")
      .orderBy("score", "desc")
      .orderBy("__name__", "desc")
      .limit(500)
      .get();

    const children = childrenSnap.docs.map((doc) => fromAdminSnapshot(doc.data(), doc.id));

    const gradeFilter = searchParams.get("grade");
    const genderFilter = searchParams.get("gender");

    let filtered = children;
    if (gradeFilter) {
      filtered = filtered.filter((c) => c.grade === gradeFilter);
    }
    if (genderFilter) {
      filtered = filtered.filter((c) => c.gender === genderFilter);
    }

    return NextResponse.json({ weeks, sessions, students: filtered });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/attendance/report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
