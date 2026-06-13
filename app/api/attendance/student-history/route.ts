import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthApi, AuthError } from "@/lib/verify-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getLastWednesdayDate, getAllWednesdaysInRange } from "@/lib/attendance-utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_WEEKS = 52;

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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return NextResponse.json(
        { error: `invalid date format: "${from}" — expected YYYY-MM-DD` },
        { status: 400 },
      );
    }

    const parsedFrom = new Date(from + "T00:00:00");
    if (isNaN(parsedFrom.getTime())) {
      return NextResponse.json({ error: `invalid date: "${from}"` }, { status: 400 });
    }

    if (parsedFrom.getDay() !== 3) {
      return NextResponse.json(
        {
          error: `from date must be a Wednesday, got ${from} (${DAY_NAMES[parsedFrom.getDay()]})`,
        },
        { status: 400 },
      );
    }

    const to = getLastWednesdayDate();
    const parsedTo = new Date(to + "T00:00:00");

    if (parsedFrom > parsedTo) {
      return NextResponse.json(
        { error: `from date (${from}) must not be after the last Wednesday (${to})` },
        { status: 400 },
      );
    }

    const weeks = getAllWednesdaysInRange(from, to);
    if (weeks.length > MAX_WEEKS) {
      return NextResponse.json(
        { error: `date range too large (${weeks.length} weeks, max ${MAX_WEEKS})` },
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

    const weekMap = new Map<string, WeekEntry>();
    for (const week of weeks) {
      weekMap.set(week, { date: week, normal: false, choir: false, choirHeld: false });
    }

    for (const result of sessionResults) {
      if (result.status === "rejected") continue;
      const { date, type, snap } = result.value;
      if (!snap.exists) continue;
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
