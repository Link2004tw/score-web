"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  markAttendanceAction,
  markAllAttendanceAction,
  finalizeChoirSessionAction,
} from "@/lib/actions";
import { filterStudents } from "@/lib/filter";
import { gradeValues } from "@/lib/schemas";
import type { StoredChild } from "@/lib/schemas";
import { getChildColor, colorDot } from "@/lib/color";
import { getLastWednesdayDate, isTodayWednesday } from "@/lib/attendance-utils";

type TabType = "normal" | "choir";

export default function AttendancePage() {
  const router = useRouter();
  const [children, setChildren] = useState<StoredChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("normal");
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [completeResult, setCompleteResult] = useState<{
    processed: number;
    markedOut: number;
  } | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const today = useMemo(() => getLastWednesdayDate(), []);

  const formattedDate = useMemo(() => {
    const d = new Date(today + "T00:00:00");
    const label = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return isTodayWednesday() ? label : `${label} (Last Wednesday)`;
  }, [today]);

  const loadStudents = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/children?limit=500");
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { children: StoredChild[] };
      setChildren(data.children);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
      setChildren([]);
      if (e instanceof Error && e.message === "Unauthorized") router.push("/login");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(
    () => filterStudents(children, { search, gender: genderFilter, grade: gradeFilter }),
    [children, search, genderFilter, gradeFilter],
  );

  const selectClass =
    "max-sm:h-11 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  const handleToggle = async (child: StoredChild) => {
    setError(null);
    setCompleteResult(null);
    setToggling(child.id);
    const result = await markAttendanceAction(child.id, activeTab);
    if ("error" in result) {
      setError(result.error);
    } else {
      setChildren((prev) =>
        prev.map((c) => {
          if (c.id !== child.id) return c;
          if (activeTab === "normal") {
            return {
              ...c,
              normalAttendance: result.count,
              lastNormalDate: result.action === "marked" ? today : undefined,
            };
          }
          return {
            ...c,
            choirAttendance: result.count,
            lastChoirDate: result.action === "marked" ? today : undefined,
          };
        }),
      );
    }
    setToggling(null);
  };

  const handleMarkAll = async () => {
    setError(null);
    setCompleteResult(null);
    const unmarked = filtered.filter((c) => {
      const lastDate = activeTab === "normal" ? c.lastNormalDate : c.lastChoirDate;
      return lastDate !== today;
    });

    if (unmarked.length === 0) return;

    setLoading(true);
    const ids = unmarked.map((c) => c.id);
    const result = await markAllAttendanceAction(ids, activeTab);
    await loadStudents();
    if ("error" in result) {
      setError(result.error);
    } else {
      const { marked, errors } = result;
      if (errors > 0) {
        setError(`${errors} student(s) failed to mark`);
      }
    }
    setLoading(false);
  };

  const handleCompleteChoir = async () => {
    setShowCompleteConfirm(false);
    setError(null);
    setCompleteResult(null);
    setCompleting(true);
    const result = await finalizeChoirSessionAction();
    setCompleting(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setCompleteResult(result);
      await loadStudents();
    }
  };

  if (loading && children.length === 0) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
          <div className="mx-auto max-w-2xl space-y-4">
            <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
              Loading...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Attendance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
          </div>

          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("normal")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "normal"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setActiveTab("choir")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "choir"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Choir
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="max-sm:min-h-[44px]"
              onClick={handleMarkAll}
              disabled={loading || filtered.length === 0}
            >
              Mark All Present
            </Button>
            <Link href="/attendance/history">
              <Button variant="ghost" size="sm" className="max-sm:min-h-[44px]">
                View History
              </Button>
            </Link>
            <Link href="/attendance/reports">
              <Button variant="ghost" size="sm" className="max-sm:min-h-[44px]">
                View Reports
              </Button>
            </Link>
            {activeTab === "choir" && children.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="max-sm:min-h-[44px]"
                onClick={() => setShowCompleteConfirm(true)}
                disabled={completing}
              >
                {completing ? "Processing..." : "Complete Choir Session"}
              </Button>
            )}
            {filtered.length < children.length && (
              <p className="text-xs text-muted-foreground">
                ({filtered.length} of {children.length} shown)
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 text-base"
            />
            <div className="flex gap-4 max-sm:flex-col max-sm:gap-2">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Grades</option>
                {gradeValues.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
              role="alert"
            >
              {error}
            </p>
          )}

          {completeResult && (
            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-3 py-2 rounded-lg">
              Session finalized. {completeResult.processed} absence(s) processed
              {completeResult.markedOut > 0
                ? `, ${completeResult.markedOut} student(s) marked out of choir`
                : ""}
              .
            </p>
          )}

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {children.length === 0
                  ? "No students yet. Add one to get started."
                  : "No students match your filters."}
              </p>
            ) : (
              filtered.map((child) => {
                const isMarked =
                  today === (activeTab === "normal" ? child.lastNormalDate : child.lastChoirDate);
                const isChoir = activeTab === "choir";
                const isOut = child.choirStatus === "out";
                const missesWarning = isChoir && child.choirMisses >= 2 && !isOut;

                return (
                  <Card key={child.id}>
                    <CardContent className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate inline-flex items-center gap-2">
                          <span
                            className={`inline-block size-2.5 rounded-full ${colorDot(getChildColor(child.grade, child.gender))}`}
                          />
                          {child.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {child.grade} &middot; {child.gender}
                          {isChoir && (
                            <>
                              {" · "}
                              <span
                                className={
                                  missesWarning
                                    ? "text-amber-600 dark:text-amber-400 font-medium"
                                    : ""
                                }
                              >
                                {child.choirMisses} miss{child.choirMisses !== 1 ? "es" : ""}
                              </span>
                              {isOut && (
                                <span className="text-destructive font-semibold ml-1">· OUT</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={isMarked ? "default" : "outline"}
                        className={`max-sm:min-h-[44px] shrink-0 ${
                          isMarked && "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                        disabled={toggling === child.id || isOut}
                        onClick={() => handleToggle(child)}
                      >
                        {toggling === child.id ? "..." : isMarked ? "✓ Present" : "Mark"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCompleteConfirm}
        title="Finalize Choir Session"
        message="Mark all unmarked students as absent for today's choir session? Students with 3 or more absences will be marked as out of choir. This can only be done once per day."
        confirmLabel="Finalize"
        cancelLabel="Cancel"
        onConfirm={handleCompleteChoir}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </ProtectedRoute>
  );
}
