"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { gradeValues } from "@/lib/schemas";
import type { StoredChild, AttendanceSession } from "@/lib/schemas";
import { getLastWednesdayDate } from "@/lib/attendance-utils";
import { getChildColor, colorDot } from "@/lib/color";
import * as XLSX from "xlsx";

type TabType = "overview" | "by-class" | "by-student";

interface ReportData {
  weeks: string[];
  students: StoredChild[];
  sessions: Record<string, { normal?: AttendanceSession; choir?: AttendanceSession }>;
}

interface StudentReport {
  id: string;
  name: string;
  grade: string;
  gender: string;
  normalCount: number;
  choirCount: number;
  totalWeeks: number;
  choirWeeks: number;
  normalPct: number;
  choirPct: number;
  choirStatus: string;
}

interface ClassReport {
  classId: string;
  label: string;
  students: StudentReport[];
  studentCount: number;
  normalAvg: number;
  choirAvg: number;
}

interface OverallReport {
  studentCount: number;
  totalWeeks: number;
  choirWeeks: number;
  normalAvg: number;
  choirAvg: number;
}

function getClassId(grade: string, gender: string): string {
  const isPrimary = grade.includes("primary");
  if (isPrimary) {
    const num = grade.match(/^(\d+)/)?.[1];
    if (!num) return grade.replace(/\s+/g, "-");
    const genderSlug = gender === "male" ? "boys" : "girls";
    return `${num}-primary-${genderSlug}`;
  }
  return grade.replace(/\s+/g, "-");
}

function getClassLabel(grade: string, gender: string): string {
  const isPrimary = grade.includes("primary");
  if (isPrimary) {
    const num = grade.match(/^(\d+)/)?.[1];
    const genderLabel = gender === "male" ? "Boys" : "Girls";
    return `Grade ${num} ${genderLabel}`;
  }
  const labelMap: Record<string, string> = {
    kg1: "KG1",
    kg2: "KG2",
    "4 years": "4 Years",
    "5 years": "5 Years",
  };
  return labelMap[grade] || grade;
}

function buildStudentReports(
  students: StoredChild[],
  sessions: Record<string, { normal?: AttendanceSession; choir?: AttendanceSession }>,
  weeks: string[],
): StudentReport[] {
  const choirWeeksTotal = weeks.filter((w) => sessions[w]?.choir).length;

  return students.map((s) => {
    let normalCount = 0;
    let choirCount = 0;

    for (const week of weeks) {
      const day = sessions[week];
      if (day?.normal?.attendees?.[s.id]) normalCount++;
      if (day?.choir?.attendees?.[s.id]) choirCount++;
    }

    const totalWeeks = weeks.length;
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
}

function buildClassReports(studentReports: StudentReport[]): ClassReport[] {
  const grouped = new Map<string, StudentReport[]>();

  for (const sr of studentReports) {
    const classId = getClassId(sr.grade, sr.gender);
    const group = grouped.get(classId) || [];
    group.push(sr);
    grouped.set(classId, group);
  }

  const reports: ClassReport[] = [];
  for (const [classId, students] of grouped) {
    const sample = students[0];
    const label = getClassLabel(sample.grade, sample.gender);
    const studentCount = students.length;
    const normalSum = students.reduce((a, s) => a + s.normalPct, 0);
    const choirSum = students.reduce((a, s) => a + s.choirPct, 0);
    reports.push({
      classId,
      label,
      students,
      studentCount,
      normalAvg: studentCount > 0 ? Math.round(normalSum / studentCount) : 0,
      choirAvg: studentCount > 0 ? Math.round(choirSum / studentCount) : 0,
    });
  }

  reports.sort((a, b) => a.label.localeCompare(b.label));
  return reports;
}

function buildOverallReport(studentReports: StudentReport[]): OverallReport {
  const count = studentReports.length;
  const totalWeeks = studentReports[0]?.totalWeeks ?? 0;
  const choirWeeks = studentReports[0]?.choirWeeks ?? 0;
  const normalSum = studentReports.reduce((a, s) => a + s.normalPct, 0);
  const choirSum = studentReports.reduce((a, s) => a + s.choirPct, 0);
  return {
    studentCount: count,
    totalWeeks,
    choirWeeks,
    normalAvg: count > 0 ? Math.round(normalSum / count) : 0,
    choirAvg: count > 0 ? Math.round(choirSum / count) : 0,
  };
}

const selectClass =
  "max-sm:h-11 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function ReportsPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const lastWednesday = useMemo(() => getLastWednesdayDate(), []);

  const startDate = useMemo(() => process.env.NEXT_PUBLIC_REPORT_START_DATE ?? "", []);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  useEffect(() => {
    if (!startDate) return;
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ from: startDate });
        if (gradeFilter) params.set("grade", gradeFilter);
        if (genderFilter) params.set("gender", genderFilter);
        const res = await fetch(`/api/attendance/report?${params}`);
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Failed to fetch report");
        const json = (await res.json()) as ReportData;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
        if (e instanceof Error && e.message === "Unauthorized") router.push("/login");
      }
      setLoading(false);
    };
    fetchReport();
  }, [startDate, gradeFilter, genderFilter, router]);

  const allStudentReports = useMemo(
    () => (data && startDate ? buildStudentReports(data.students, data.sessions, data.weeks) : []),
    [data, startDate],
  );

  const searchedStudentReports = useMemo(
    () =>
      search
        ? allStudentReports.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        : allStudentReports,
    [allStudentReports, search],
  );

  const classReports = useMemo(
    () => buildClassReports(searchedStudentReports),
    [searchedStudentReports],
  );

  const overall = useMemo(
    () => buildOverallReport(searchedStudentReports),
    [searchedStudentReports],
  );

  const handleExportExcel = () => {
    if (!data || !allStudentReports.length) return;

    const wb = XLSX.utils.book_new();

    const overviewRows = [
      ["Attendance Report"],
      [],
      ["Metric", "Value"],
      ["Total Students", overall.studentCount],
      ["Normal Weeks", overall.totalWeeks],
      ["Choir Sessions", overall.choirWeeks],
      ["Normal Avg %", `${overall.normalAvg}%`],
      ["Choir Avg %", `${overall.choirAvg}%`],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    XLSX.utils.book_append_sheet(wb, overviewSheet, "Overview");

    const classRows = [
      ["Class", "Students", "Normal Avg %", "Choir Avg %"],
      ...classReports.map((c) => [c.label, c.studentCount, `${c.normalAvg}%`, `${c.choirAvg}%`]),
    ];
    const classSheet = XLSX.utils.aoa_to_sheet(classRows);
    XLSX.utils.book_append_sheet(wb, classSheet, "By Class");

    const studentRows = [
      ["Name", "Grade", "Gender", "Normal", "Normal %", "Choir", "Choir %", "Status"],
      ...allStudentReports.map((s) => [
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
    const studentSheet = XLSX.utils.aoa_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, studentSheet, "By Student");

    XLSX.writeFile(wb, `attendance-report-${startDate}-to-${lastWednesday}.xlsx`);
  };

  const handleExportPdf = async () => {
    if (!allStudentReports.length) return;

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Attendance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`${startDate} to ${lastWednesday}`, 14, 28);

    doc.setFontSize(12);
    doc.text("Overview", 14, 38);
    const overviewBody = [
      ["Total Students", String(overall.studentCount)],
      ["Normal Weeks", String(overall.totalWeeks)],
      ["Choir Sessions", String(overall.choirWeeks)],
      ["Normal Avg %", `${overall.normalAvg}%`],
      ["Choir Avg %", `${overall.choirAvg}%`],
    ];
    autoTable(doc, {
      startY: 42,
      head: [["Metric", "Value"]],
      body: overviewBody,
      theme: "striped",
    });

    doc.addPage();
    doc.setFontSize(12);
    doc.text("By Student", 14, 20);
    const studentBody = allStudentReports.map((s) => [
      s.name,
      s.grade,
      s.gender,
      String(s.normalCount),
      `${s.normalPct}%`,
      String(s.choirCount),
      `${s.choirPct}%`,
      s.choirStatus === "out" ? "OUT" : "Active",
    ]);
    autoTable(doc, {
      startY: 28,
      head: [["Name", "Grade", "Gender", "Normal", "N%", "Choir", "C%", "Status"]],
      body: studentBody,
      theme: "striped",
    });

    doc.save(`attendance-report-${startDate}-to-${lastWednesday}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "by-class", label: "By Class" },
    { key: "by-student", label: "By Student" },
  ];

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8" ref={printRef}>
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
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Attendance Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View attendance summaries and export data
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Range: {startDate} → {lastWednesday}
            </p>

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

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={!data || allStudentReports.length === 0}
                className="max-sm:min-h-[44px]"
              >
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={!data || allStudentReports.length === 0}
                className="max-sm:min-h-[44px]"
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!data || allStudentReports.length === 0}
                className="max-sm:min-h-[44px]"
              >
                Print
              </Button>
            </div>

            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {error && (
            <p
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
              role="alert"
            >
              {error}
            </p>
          )}

          {loading && (
            <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
              Loading report...
            </p>
          )}

          {data && !loading && startDate && (
            <>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{overall.studentCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Normal Weeks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{overall.totalWeeks}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Choir Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{overall.choirWeeks}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Normal Avg
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{overall.normalAvg}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Choir Avg
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{overall.choirAvg}%</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "by-class" && (
                <Card>
                  <CardContent>
                    {classReports.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No classes match your filters.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Class</TableHead>
                              <TableHead className="text-right">Students</TableHead>
                              <TableHead className="text-right">Norm Avg</TableHead>
                              <TableHead className="text-right">Choir Avg</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classReports.map((c) => (
                              <TableRow
                                key={c.classId}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => router.push(`/attendance/class/${c.classId}`)}
                              >
                                <TableCell className="font-medium">{c.label}</TableCell>
                                <TableCell className="text-right">{c.studentCount}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {c.normalAvg}%
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {c.choirAvg}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "by-student" && (
                <Card>
                  <CardContent>
                    {searchedStudentReports.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {allStudentReports.length === 0
                          ? "No students found."
                          : "No students match your filters."}
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
                            {searchedStudentReports.map((s) => (
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
                                    <span className="text-destructive font-semibold text-xs">
                                      OUT
                                    </span>
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
              )}

              <p className="text-xs text-muted-foreground text-center">
                {allStudentReports.length} student
                {allStudentReports.length !== 1 ? "s" : ""} · {data.weeks.length} normal week
                {data.weeks.length !== 1 ? "s" : ""} · {overall.choirWeeks} choir session
                {overall.choirWeeks !== 1 ? "s" : ""}
              </p>
            </>
          )}

          {!startDate && !loading && (
            <p className="text-center py-8 text-muted-foreground">
              Set NEXT_PUBLIC_REPORT_START_DATE in your environment variables.
            </p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
