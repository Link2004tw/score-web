import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getLastWednesdayForDate,
  getLastWednesdayDate,
  getAllWednesdaysInRange,
} from "@/lib/attendance-utils";
import type { AttendanceSession, StoredChild } from "@/lib/schemas";
import { gradeValues } from "@/lib/schemas";

function fromAdminSnapshot(data: FirebaseFirestore.DocumentData, id: string): StoredChild {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    grade: (gradeValues as readonly string[]).includes(data.grade)
      ? (data.grade as StoredChild["grade"])
      : "kg1",
    gender: data.gender === "male" || data.gender === "female" ? data.gender : "male",
    score: Number(data.score) || 0,
    normalAttendance: Number(data.normalAttendance) || 0,
    choirAttendance: Number(data.choirAttendance) || 0,
    choirMisses: Number(data.choirMisses) || 0,
    choirStatus: data.choirStatus === "out" ? "out" : "active",
    lastNormalDate: typeof data.lastNormalDate === "string" ? data.lastNormalDate : undefined,
    lastChoirDate: typeof data.lastChoirDate === "string" ? data.lastChoirDate : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
  };
}

function parseFromDate(from: string): { error?: NextResponse; parsed?: Date } {
  const parsedFrom = new Date(from + "T00:00:00");

  if (isNaN(parsedFrom.getTime())) {
    return {
      error: NextResponse.json(
        { error: `invalid date format: "${from}" — expected YYYY-MM-DD` },
        { status: 400 },
      ),
    };
  }

  const wed = getLastWednesdayForDate(from);
  return { parsed: new Date(wed + "T00:00:00") };
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return NextResponse.json(
        { error: `invalid date format: "${from}" — expected YYYY-MM-DD` },
        { status: 400 },
      );
    }

    const { error: dateError, parsed: parsedFrom } = parseFromDate(from);
    if (dateError) return dateError;

    const fromWed = `${parsedFrom!.getFullYear()}-${String(parsedFrom!.getMonth() + 1).padStart(2, "0")}-${String(parsedFrom!.getDate()).padStart(2, "0")}`;
    const to = getLastWednesdayDate();
    const parsedTo = new Date(to + "T00:00:00");

    if (parsedFrom! > parsedTo) {
      return NextResponse.json(
        {
          error: `from date (${from}) snaps to ${fromWed}, which must not be after the last Wednesday (${to})`,
        },
        { status: 400 },
      );
    }

    const startDate = process.env.NEXT_PUBLIC_REPORT_START_DATE;
    if (startDate && fromWed < startDate) {
      return NextResponse.json(
        {
          error: `from date (${from}) snaps to ${fromWed}, which is before the report start date (${startDate})`,
        },
        { status: 400 },
      );
    }

    const weeks = getAllWednesdaysInRange(fromWed, to);

    const gradeFilter = searchParams.get("grade");
    const genderFilter = searchParams.get("gender");

    if (gradeFilter && !(gradeValues as readonly string[]).includes(gradeFilter)) {
      return NextResponse.json({ error: `invalid grade: "${gradeFilter}"` }, { status: 400 });
    }

    if (genderFilter && genderFilter !== "male" && genderFilter !== "female") {
      return NextResponse.json(
        { error: `invalid gender: "${genderFilter}" — expected "male" or "female"` },
        { status: 400 },
      );
    }

    const sessionResults = await Promise.allSettled(
      weeks.flatMap((date) => [
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
      ]),
    );

    const sessions: Record<string, { normal?: AttendanceSession; choir?: AttendanceSession }> = {};
    for (const result of sessionResults) {
      if (result.status === "fulfilled") {
        const { date, type, snap } = result.value;
        if (snap.exists) {
          sessions[date] = sessions[date] || {};
          sessions[date][type] = snap.data() as AttendanceSession;
        }
      }
    }

    const childrenSnap = await adminDb
      .collection("children")
      .orderBy("score", "desc")
      .orderBy("__name__", "desc")
      .limit(500)
      .get();

    const children = childrenSnap.docs.map((doc) => fromAdminSnapshot(doc.data(), doc.id));

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
