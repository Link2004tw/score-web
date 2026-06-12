import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getLastWednesdayDate, getAllWednesdaysInRange } from "@/lib/attendance-utils";

interface WeekEntry {
  date: string;
  normal: boolean;
  choir: boolean;
  choirHeld: boolean;
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
    const studentId = searchParams.get("studentId");

    if (!from || !studentId) {
      return NextResponse.json(
        { error: "from and studentId query params required" },
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

    const weekMap = new Map<string, WeekEntry>();
    for (const week of weeks) {
      weekMap.set(week, { date: week, normal: false, choir: false, choirHeld: false });
    }

    for (const { date, type, snap } of results) {
      if (!snap.exists) {
        if (type === "choir") {
          const entry = weekMap.get(date);
          if (entry) entry.choirHeld = false;
        }
        continue;
      }
      if (type === "choir") {
        const entry = weekMap.get(date);
        if (entry) entry.choirHeld = true;
      }
      const attendees = snap.data()?.attendees as Record<string, string> | undefined;
      const entry = weekMap.get(date);
      if (!entry) continue;
      if (attendees && studentId in attendees) {
        entry[type] = true;
      }
    }

    const history = Array.from(weekMap.values()).reverse();
    const normalCount = history.filter((w) => w.normal).length;
    const choirCount = history.filter((w) => w.choir).length;
    const choirWeeks = history.filter((w) => w.choirHeld).length;

    return NextResponse.json({
      history,
      normalCount,
      choirCount,
      totalWeeks: weeks.length,
      choirWeeks,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("GET /api/attendance/student-history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
