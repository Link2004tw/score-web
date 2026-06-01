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
  detail?: string;
  timestamp?: string;
};

type DisplayLogEntry = LogEntry & {
  timestampLabel: string;
  targetLabel: string;
};

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/logs?limit=${limit}`);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = (await res.json()) as { logs: LogEntry[] };
      setLogs(data.logs);
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
  }, []);

  const formatted = useMemo<DisplayLogEntry[]>(() => {
    return logs.map((l) => ({
      ...l,
      timestampLabel: l.timestamp ? new Date(l.timestamp).toLocaleString() : "",
      targetLabel: l.targetName || l.targetId || "",
    }));
  }, [logs]);

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                Refresh
              </Button>
              <select
                className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                }}
                aria-label="Log limit"
              >
                {[50, 100, 200, 300, 500].map((n) => (
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
                        <TableHead>Target</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formatted.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap">{l.timestampLabel}</TableCell>
                          <TableCell className="font-medium">{l.action}</TableCell>
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

              <div className="pt-4 text-xs text-muted-foreground">
                Logs are stored at <code className="font-mono">/logs</code> in Firebase Realtime DB.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
