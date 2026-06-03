"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getLastWednesdayDate } from "@/lib/attendance-utils";
import type { AttendanceSession } from "@/lib/schemas";

function isWednesday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 3;
}

export default function AttendanceHistoryPage() {
  const [date, setDate] = useState(getLastWednesdayDate());
  const [type, setType] = useState<"normal" | "choir">("normal");
  const [session, setSession] = useState<AttendanceSession | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async (d: string, t: "normal" | "choir") => {
    setLoading(true);
    setError(null);
    setSession(undefined);
    try {
      const res = await fetch(`/api/attendance-sessions?date=${d}&type=${t}`);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { session: AttendanceSession | null };
      setSession(data.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
    }
    setLoading(false);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    if (!isWednesday(value)) return;
    fetchSession(value, type);
  };

  const handleTypeChange = (t: "normal" | "choir") => {
    setType(t);
    if (isWednesday(date)) {
      fetchSession(date, t);
    }
  };

  const handleSearch = () => {
    if (!isWednesday(date)) return;
    fetchSession(date, type);
  };

  const attendees = session?.attendees
    ? Object.entries(session.attendees).sort(([, a], [, b]) => a.localeCompare(b))
    : [];
  const count = session?.count ?? 0;

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Attendance
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Attendance History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View who attended on a past Wednesday
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="date-input" className="text-sm font-medium mb-1 block">
                Date
              </label>
              <input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {!isWednesday(date) && (
                <p className="text-sm text-destructive mt-1" role="alert">
                  Please select a Wednesday
                </p>
              )}
            </div>

            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => handleTypeChange("normal")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === "normal"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => handleTypeChange("choir")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === "choir"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Choir
              </button>
            </div>

            <Button
              onClick={handleSearch}
              disabled={!isWednesday(date) || loading}
              className="max-sm:min-h-[44px]"
            >
              {loading ? "Loading..." : "View Attendance"}
            </Button>
          </div>

          {error && (
            <p
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
              role="alert"
            >
              {error}
            </p>
          )}

          {session === null && !loading && !error && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No attendance recorded for this date.
            </p>
          )}

          {session && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {count} student{count !== 1 ? "s" : ""} present
              </p>
              {attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees found.</p>
              ) : (
                attendees.map(([id, name]) => (
                  <Card key={id}>
                    <CardContent className="py-3">
                      <p className="font-medium">{name}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {loading && session === undefined && (
            <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
              Loading...
            </p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
