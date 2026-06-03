"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adjustScoreAction } from "@/lib/actions";
import { gradeValues } from "@/lib/schemas";
import { filterStudents } from "@/lib/filter";
import type { StoredChild } from "@/lib/schemas";
import { getChildColor, colorDot } from "@/lib/color";

export default function ScorePage() {
  const router = useRouter();
  const [children, setChildren] = useState<StoredChild[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [scoreChanged, setScoreChanged] = useState<{ id: string; delta: number } | null>(null);

  useEffect(() => {
    if (!scoreChanged) return;
    const timer = setTimeout(() => setScoreChanged(null), 600);
    return () => clearTimeout(timer);
  }, [scoreChanged]);

  useEffect(() => {
    fetch("/api/children?limit=500")
      .then((res) => {
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: { children: StoredChild[] }) => {
        setChildren(data.children);
        setLoading(false);
      })
      .catch((e) => {
        setChildren([]);
        setError(
          e.message === "Unauthorized"
            ? "Session expired. Please log in again."
            : "Failed to load students.",
        );
        setLoading(false);
        if (e.message === "Unauthorized") router.push("/login");
      });
  }, [router]);

  const filtered = useMemo(
    () => filterStudents(children, { search, gender: genderFilter, grade: gradeFilter }),
    [children, search, genderFilter, gradeFilter],
  );

  const handleAdjust = async (id: string, delta: number) => {
    setError(null);
    setUpdating(id);
    try {
      const result = await adjustScoreAction(id, delta);
      if ("error" in result) {
        setError(result.error);
      } else {
        setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, score: result.score } : c)));
        setScoreChanged({ id, delta });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setUpdating(null);
  };

  if (loading)
    return (
      <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
        Loading...
      </p>
    );

  const selectClass =
    "max-sm:h-11 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Adjust Scores</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="max-sm:h-11 h-10 w-20 text-center"
                min={1}
                max={100}
              />
            </div>
          </div>

          <Input
            placeholder="Search students..."
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

          {error && (
            <p className="text-sm text-destructive text-center py-2" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {children.length === 0 ? "No students yet." : "No students match your filters."}
              </p>
            ) : (
              filtered.map((child) => (
                <Card key={child.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate inline-flex items-center gap-2">
                        <span
                          className={`inline-block size-2.5 rounded-full ${colorDot(getChildColor(child.grade, child.gender))}`}
                        />
                        {child.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {child.grade} &middot; {child.gender}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-semibold w-10 text-right tabular-nums transition-all duration-300 ${(() => {
                          const changed = scoreChanged;
                          if (changed === null || changed.id !== child.id) return "";
                          return changed.delta > 0
                            ? "animate-score-bump text-primary"
                            : "animate-score-bump text-destructive";
                        })()}`}
                      >
                        {child.score}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="destructive"
                          className="max-sm:size-11 size-8"
                          disabled={updating === child.id}
                          onClick={() => handleAdjust(child.id, -Number(customAmount))}
                        >
                          &minus;
                        </Button>
                        <Button
                          size="icon"
                          className="max-sm:size-11 size-8"
                          disabled={updating === child.id}
                          onClick={() => handleAdjust(child.id, Number(customAmount))}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
