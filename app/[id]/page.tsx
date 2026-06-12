"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { deleteChildAction } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { StoredChild } from "@/lib/schemas";
import { getChildColor, colorDot } from "@/lib/color";
import { getTotalWednesdaysSince, getLastWednesdayDate } from "@/lib/attendance-utils";

export default function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [child, setChild] = useState<StoredChild | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/children/${id}`)
      .then((res) => {
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setChild(data);
        setLoading(false);
      })
      .catch((e) => {
        if (e.message === "Unauthorized") router.push("/login");
        setNotFound(true);
        setLoading(false);
      });
  }, [id, router]);

  const handleDelete = async () => {
    if (!child) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!child) return;
    setShowDeleteConfirm(false);
    try {
      await deleteChildAction(child.id);
      router.push("/leaderboard");
    } catch {
      router.push("/login");
    }
  };

  const lastWednesday = useMemo(() => getLastWednesdayDate(), []);
  const historyStartDate = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_REPORT_START_DATE;
    if (env) return env;
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const day = d.getDay();
    const diff = (day - 3 + 7) % 7;
    d.setDate(d.getDate() - diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);
  const [historyData, setHistoryData] = useState<{
    history: { date: string; normal: boolean; choir: boolean; choirHeld: boolean }[];
    normalCount: number;
    choirCount: number;
    totalWeeks: number;
    choirWeeks: number;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!child) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await fetch(
          `/api/attendance/student-history?from=${historyStartDate}&studentId=${child.id}`,
        );
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setHistoryData(json);
      } catch (e) {
        setHistoryError(e instanceof Error ? e.message : "Failed to load history");
        if (e instanceof Error && e.message === "Unauthorized") router.push("/login");
      }
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [child, historyStartDate, router]);

  if (loading)
    return (
      <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
        Loading...
      </p>
    );

  if (notFound) {
    return (
      <ProtectedRoute>
        <div className="min-h-dvh bg-background p-4 md:p-8">
          <div className="mx-auto max-w-2xl">
            <p className="text-muted-foreground">Student not found.</p>
            <Link href="/leaderboard">
              <Button className="mt-4">Back to Leaderboard</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!child) return null;

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Leaderboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
              <span
                className={`inline-block size-3 rounded-full ${colorDot(getChildColor(child.grade, child.gender))}`}
              />
              {child.name}
            </h1>
            <div className="flex gap-2">
              <Link href={`/${child.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="max-sm:min-h-[44px] max-sm:min-w-[44px]"
                >
                  Edit
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                className="max-sm:min-h-[44px] max-sm:min-w-[44px]"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Name</dt>
                  <dd className="text-sm font-medium">{child.name}</dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Grade</dt>
                  <dd className="text-sm font-medium">{child.grade}</dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Gender</dt>
                  <dd className="text-sm font-medium capitalize">{child.gender}</dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Score</dt>
                  <dd className="text-sm font-medium">{child.score}</dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Normal Attendance</dt>
                  <dd className="text-sm font-medium tabular-nums text-right">
                    {child.normalAttendance}
                    <span className="text-muted-foreground ml-1">
                      (
                      {Math.round(
                        (child.normalAttendance / getTotalWednesdaysSince(child.createdAt)) * 100,
                      )}
                      %)
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Choir Attendance</dt>
                  <dd className="text-sm font-medium tabular-nums text-right">
                    {child.choirAttendance}
                    <span className="text-muted-foreground ml-1">
                      (
                      {Math.round(
                        (child.choirAttendance / getTotalWednesdaysSince(child.createdAt)) * 100,
                      )}
                      %)
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Choir Misses</dt>
                  <dd className="text-sm font-medium">{child.choirMisses}</dd>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-sm text-muted-foreground">Choir Status</dt>
                  <dd className="text-sm font-medium">
                    {child.choirStatus === "out" ? (
                      <span className="text-destructive font-semibold">OUT</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">Active</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Added</dt>
                  <dd className="text-sm font-medium">
                    {new Date(child.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {historyStartDate} → {lastWednesday}
              </p>

              {historyError && (
                <p
                  className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                  role="alert"
                >
                  {historyError}
                </p>
              )}

              {historyLoading && (
                <p
                  className="text-sm text-muted-foreground text-center py-4"
                  role="status"
                  aria-live="polite"
                >
                  Loading history...
                </p>
              )}

              {historyData && !historyLoading && (
                <>
                  <div className="flex gap-4 text-sm">
                    <p>
                      Normal:{" "}
                      <span className="font-medium tabular-nums">
                        {historyData.normalCount}/{historyData.totalWeeks}
                      </span>
                    </p>
                    <p>
                      Choir:{" "}
                      <span className="font-medium tabular-nums">
                        {historyData.choirCount}/{historyData.choirWeeks}
                      </span>
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">Week</th>
                          <th className="text-center py-2 px-2 font-medium w-16">Norm</th>
                          <th className="text-center py-2 px-2 font-medium w-16">Choir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.history.map((week) => (
                          <tr key={week.date} className="border-b last:border-0">
                            <td className="py-2 pr-4 text-muted-foreground tabular-nums">
                              {new Date(week.date + "T00:00:00").toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="text-center py-2 px-2">
                              {week.normal ? (
                                <span className="text-green-600 dark:text-green-400 text-lg leading-none">
                                  &#10003;
                                </span>
                              ) : (
                                <span className="text-destructive text-lg leading-none">
                                  &#10007;
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {!week.choirHeld ? (
                                <span className="text-muted-foreground text-lg leading-none">
                                  &mdash;
                                </span>
                              ) : week.choir ? (
                                <span className="text-green-600 dark:text-green-400 text-lg leading-none">
                                  &#10003;
                                </span>
                              ) : (
                                <span className="text-destructive text-lg leading-none">
                                  &#10007;
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">
                      &mdash; = No choir session held that week
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete student"
        message={child ? `Delete ${child.name}? This cannot be undone.` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </ProtectedRoute>
  );
}
