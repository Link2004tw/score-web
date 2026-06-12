"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { StoredChild, AttendanceSession } from "@/lib/schemas";
import { getChildColor, colorDot } from "@/lib/color";
import { getLastWednesdayDate } from "@/lib/attendance-utils";
import * as XLSX from "xlsx";

interface ReportData {
  weeks: string[];
  students: StoredChild[];
  sessions: Record<string, { normal?: AttendanceSession; choir?: AttendanceSession }>;
}

function parseClassId(classId: string): { grade: string; gender?: string; label: string } {
  const primaryMatch = classId.match(/^(\d)-primary-(boys|girls)$/);
  if (primaryMatch) {
    const num = primaryMatch[1];
    const gender = primaryMatch[2] === "boys" ? "male" : "female";
    const genderLabel = gender === "male" ? "Boys" : "Girls";
    return {
      grade: `${num} primary`,
      gender,
      label: `Grade ${num} ${genderLabel}`,
    };
  }

  const gradeMap: Record<string, string> = {
    kg1: "kg1",
    kg2: "kg2",
    "4-years": "4 years",
    "5-years": "5 years",
  };

  const grade = gradeMap[classId] || classId;
  const labelMap: Record<string, string> = {
    kg1: "KG1",
    kg2: "KG2",
    "4-years": "4 Years",
    "5-years": "5 Years",
  };
  return { grade, label: labelMap[classId] || classId };
}

export default function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();

  const classInfo = useMemo(() => parseClassId(classId), [classId]);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastWednesday = useMemo(() => getLastWednesdayDate(), []);

  const initDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
    // snap to nearest wed
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("from", initDate);
        params.set("grade", classInfo.grade);
        if (classInfo.gender) params.set("gender", classInfo.gender);
        const res = await fetch(`/api/attendance/report?${params}`);
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = (await res.json()) as ReportData;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load class report");
        if (e instanceof Error && e.message === "Unauthorized") router.push("/login");
      }
      setLoading(false);
    };
    fetchReport();
  }, [classInfo, initDate, router]);

  const studentReports = useMemo(() => {
    if (!data) return [];
    const choirWeeksTotal = data.weeks.filter((w) => data.sessions[w]?.choir).length;
    return data.students.map((s) => {
      let normalCount = 0;
      let choirCount = 0;
      for (const week of data.weeks) {
        const day = data.sessions[week];
        if (day?.normal?.attendees?.[s.id]) normalCount++;
        if (day?.choir?.attendees?.[s.id]) choirCount++;
      }
      const totalWeeks = data.weeks.length;
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        gender: s.gender,
        normalCount,
        choirCount,
        totalWeeks,
        choirWeeks: choirWeeksTotal,
        normalPct: totalWeeks > 0 ? Math.round((normalCount / totalWeeks) * 100) : 0,
        choirPct: choirWeeksTotal > 0 ? Math.round((choirCount / choirWeeksTotal) * 100) : 0,
        choirStatus: s.choirStatus,
      };
    });
  }, [data]);

  const classAggregate = useMemo(() => {
    const n = studentReports.length;
    if (n === 0) return { normalAvg: 0, choirAvg: 0 };
    return {
      normalAvg: Math.round(studentReports.reduce((a, s) => a + s.normalPct, 0) / n),
      choirAvg: Math.round(studentReports.reduce((a, s) => a + s.choirPct, 0) / n),
    };
  }, [studentReports]);

  const handleExportExcel = () => {
    if (!studentReports.length) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Class Report", classInfo.label],
      [],
      ["Name", "Grade", "Gender", "Normal", "Normal %", "Choir", "Choir %", "Status"],
      ...studentReports.map((s) => [
        s.name,
        s.grade,
        s.gender,
        s.normalCount,
        `${s.normalPct}%`,
        s.choirCount,
        `${s.choirPct}%`,
        s.choirStatus === "out" ? "OUT" : "Active",
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, classInfo.label);
    XLSX.writeFile(wb, `class-${classId}-report.xlsx`);
  };

  const handleExportPdf = async () => {
    if (!studentReports.length) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Class Report: ${classInfo.label}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Range up to ${lastWednesday}`, 14, 28);
    const body = studentReports.map((s) => [
      s.name,
      s.grade,
      s.normalCount,
      `${s.normalPct}%`,
      s.choirCount,
      `${s.choirPct}%`,
      s.choirStatus === "out" ? "OUT" : "Active",
    ]);
    autoTable(doc, {
      startY: 36,
      head: [["Name", "Grade", "Normal", "N%", "Choir", "C%", "Status"]],
      body,
      theme: "striped",
    });
    doc.save(`class-${classId}-report.pdf`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
          Loading...
        </p>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/attendance/reports"
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
            Back to Reports
          </Link>

          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{classInfo.label}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {studentReports.length} student{studentReports.length !== 1 ? "s" : ""}
              {data
                ? ` · ${data.weeks.length} normal weeks · ${data.weeks.filter((w) => data.sessions[w]?.choir).length} choir sessions`
                : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Normal Avg
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{classAggregate.normalAvg}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Choir Avg
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{classAggregate.choirAvg}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={studentReports.length === 0}
              className="max-sm:min-h-[44px]"
            >
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={studentReports.length === 0}
              className="max-sm:min-h-[44px]"
            >
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={studentReports.length === 0}
              className="max-sm:min-h-[44px]"
            >
              Print
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

          <Card>
            <CardContent>
              {studentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No students in this class.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead className="text-right">Norm</TableHead>
                        <TableHead className="text-right">Choir</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentReports.map((s) => (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/${s.id}`)}
                        >
                          <TableCell className="font-medium inline-flex items-center gap-2">
                            <span
                              className={`inline-block size-2.5 rounded-full ${colorDot(getChildColor(s.grade, s.gender))}`}
                            />
                            {s.name}
                          </TableCell>
                          <TableCell>{s.grade}</TableCell>
                          <TableCell className="capitalize">{s.gender}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.normalCount}
                            <span className="text-muted-foreground text-xs ml-0.5">
                              {s.normalPct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.choirCount}
                            <span className="text-muted-foreground text-xs ml-0.5">
                              {s.choirPct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {s.choirStatus === "out" ? (
                              <span className="text-destructive font-semibold text-xs">OUT</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                                Active
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
