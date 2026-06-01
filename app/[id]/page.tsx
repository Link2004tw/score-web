"use client";

import { useEffect, useState, use } from "react";
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

  if (loading)
    return (
      <p className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
        Loading...
      </p>
    );

  if (notFound) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background p-4 md:p-8">
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
      <div className="bg-background p-4 md:p-8">
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
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
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
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Added</dt>
                  <dd className="text-sm font-medium">
                    {new Date(child.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
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
