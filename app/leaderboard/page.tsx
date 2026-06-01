"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { filterStudents } from "@/lib/filter";
import type { StoredChild } from "@/lib/schemas";
import { getChildColor, colorDot } from "@/lib/color";

interface PageData {
  children: StoredChild[];
  hasMore: boolean;
}

const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const router = useRouter();
  const [children, setChildren] = useState<StoredChild[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const buildUrl = useCallback((startAfter?: { score: number; id: string }) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (startAfter) {
      params.set("score", String(startAfter.score));
      params.set("id", startAfter.id);
    }
    return `/api/children?${params}`;
  }, []);

  const fetchPage = useCallback(
    async (startAfter?: { score: number; id: string }) => {
      const res = await fetch(buildUrl(startAfter));
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch");
      return (await res.json()) as PageData;
    },
    [buildUrl],
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchPage();
      setChildren(data.children);
      setHasMore(data.hasMore);
    } catch (e) {
      setChildren([]);
      setHasMore(false);
      setError(true);
      if (e instanceof Error && e.message === "Unauthorized") router.push("/login");
    }
    setLoading(false);
  }, [fetchPage, router]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || children.length === 0) return;
    setLoadingMore(true);
    try {
      const last = children[children.length - 1];
      const data = await fetchPage({ score: last.score, id: last.id });
      setChildren((prev) => [...prev, ...data.children]);
      setHasMore(data.hasMore);
    } catch {
      setError(true);
    }
    setLoadingMore(false);
  };

  const handleFilterChange = () => {
    setSearch("");
    setGenderFilter("");
    setGradeFilter("");
    loadFirstPage();
  };

  const filtered = useMemo(
    () => filterStudents(children, { search, gender: genderFilter, grade: gradeFilter }),
    [children, search, genderFilter, gradeFilter],
  );

  if (loading) {
    return (
      <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
        Loading...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center py-8 text-destructive" role="alert">
        Failed to load students.
      </p>
    );
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 text-base"
            />
            <div className="flex gap-4">
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

          <Card>
            <CardHeader>
              <CardTitle>All Students</CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {children.length === 0
                    ? "No students yet. Add one to get started."
                    : "No students match your filters."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((child, i) => (
                        <TableRow key={child.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/${child.id}`} className="inline-flex items-center gap-2">
                              <span
                                className={`inline-block size-2.5 rounded-full ${colorDot(getChildColor(child.grade, child.gender))}`}
                              />
                              {child.name}
                            </Link>
                          </TableCell>
                          <TableCell>{child.grade}</TableCell>
                          <TableCell className="capitalize">{child.gender}</TableCell>
                          <TableCell className="text-right font-semibold">{child.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filtered.length} of {children.length} loaded
                </p>
                {hasMore && (
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
