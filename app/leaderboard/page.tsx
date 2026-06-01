"use client";

import { useEffect, useState, useMemo } from "react";
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
import type { StoredChild } from "@/lib/store";

export default function LeaderboardPage() {
  const [children, setChildren] = useState<StoredChild[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/children")
      .then((res) => res.json())
      .then((data: StoredChild[]) => {
        setChildren(data);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return children.filter((child) => {
      if (search && !child.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (genderFilter && child.gender !== genderFilter) return false;
      if (gradeFilter && child.grade !== gradeFilter) return false;
      return true;
    });
  }, [children, search, genderFilter, gradeFilter]);

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;

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
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={selectClass}>
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className={selectClass}>
                <option value="">All Grades</option>
                {gradeValues.map((g) => (
                  <option key={g} value={g}>{g}</option>
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
                            <Link href={`/${child.id}`}>{child.name}</Link>
                          </TableCell>
                          <TableCell>{child.grade}</TableCell>
                          <TableCell className="capitalize">{child.gender}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {Number(child.score)}
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
