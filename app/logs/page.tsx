"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogEntry = {
  id: string;
  action: string;
  targetId?: string;
  targetName?: string;
  actorDisplayName?: string;
  detail?: string;
  timestamp?: string;
};

type DisplayLogEntry = LogEntry & {
  timestampLabel: string;
  targetLabel: string;
  actorLabel: string;
};

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [hasNext, setHasNext] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/logs?limit=${limit}&page=${page}${actionFilter !== "all" ? `&action=${encodeURIComponent(actionFilter)}` : ""}`,
      );

      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = (await res.json()) as { logs: LogEntry[]; hasNext?: boolean };
      setLogs(data.logs);
      setHasNext(Boolean(data.hasNext));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load logs";
      setError(msg === "Unauthorized" ? "Session expired. Please log in again." : msg);
      if (msg === "Unauthorized") router.push("/login");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchLogs();
    })();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, actionFilter]);

  const formatted = useMemo<DisplayLogEntry[]>(() => {
    // Ensure newest -> oldest even if the API ordering changes.
    const sorted = [...logs].sort((a, b) => {
      const at = new Date(a.timestamp ?? 0).getTime();
      const bt = new Date(b.timestamp ?? 0).getTime();
      return bt - at;
    });

    return sorted.map((l) => ({
      ...l,
      timestampLabel: l.timestamp ? new Date(l.timestamp).toLocaleString() : "",
      targetLabel: l.targetName || l.targetId || "",
      actorLabel: l.actorDisplayName || "Unknown",
    }));
  }, [logs]);

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="max-sm:min-h-[44px]"
                onClick={fetchLogs}
                disabled={loading}
              >
                Refresh
              </Button>
              <select
                className="max-sm:h-11 h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                value={actionFilter}
                onChange={(e) => {
                  setPage(1);
                  setActionFilter(e.target.value);
                }}
                aria-label="Filter by action"
              >
                <option value="all">All actions</option>
                <option value="addChild">addChild</option>
                <option value="updateChild">updateChild</option>
                <option value="deleteChild">deleteChild</option>
                <option value="adjustScore">adjustScore</option>
                <option value="markNormalAttendance">markNormalAttendance</option>
                <option value="unmarkNormalAttendance">unmarkNormalAttendance</option>
                <option value="markChoirAttendance">markChoirAttendance</option>
                <option value="unmarkChoirAttendance">unmarkChoirAttendance</option>
                <option value="markAllNormalAttendance">markAllNormalAttendance</option>
                <option value="markAllChoirAttendance">markAllChoirAttendance</option>
                <option value="finalizeChoirSession">finalizeChoirSession</option>
              </select>
              <select
                className="max-sm:h-11 h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                aria-label="Log limit"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">
                Showing {logs.length} log entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p
                  className="text-center py-8 text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  Loading...
                </p>
              ) : error ? (
                <p className="text-sm text-destructive text-center py-2" role="alert">
                  {error}
                </p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No logs yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[220px]">Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formatted.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap">{l.timestampLabel}</TableCell>
                          <TableCell className="font-medium">{l.action}</TableCell>
                          <TableCell className="whitespace-nowrap">{l.actorLabel}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {l.targetId ? (
                              <Link
                                href={`/${l.targetId}`}
                                className="text-primary hover:underline"
                              >
                                {l.targetLabel || l.targetId}
                              </Link>
                            ) : (
                              l.targetLabel
                            )}
                          </TableCell>
                          <TableCell>{l.detail ?? ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="pt-4 flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
                <div>
                  Logs are stored at <code className="font-mono">/logs</code> in Firebase Realtime
                  DB.
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={loading}
                    aria-disabled={loading || page <= 1}
                    title={page <= 1 ? "Already on page 1" : undefined}
                    className="text-black disabled:opacity-100 disabled:bg-muted/60 disabled:text-black"
                  >
                    Prev
                  </Button>
                  <span className="min-w-[60px] text-center">Page {page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                    aria-disabled={loading || !hasNext}
                    title={!hasNext ? "No next page" : undefined}
                    className="text-black disabled:opacity-100 disabled:bg-muted/60 disabled:text-black"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
