"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChildForm } from "@/components/ChildForm";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { updateChildAction } from "@/lib/actions";
import type { Child, StoredChild } from "@/lib/schemas";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [child, setChild] = useState<StoredChild | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Child) => {
    if (!child) return;
    try {
      console.log(data);
      await updateChildAction(child.id, data);
      router.push(`/${child.id}`);
    } catch (e) {
      if (e instanceof Error && e.name === "AuthError") {
        router.push("/login");
      } else {
        setError(e instanceof Error ? e.message : "Failed to save changes. Please try again.");
      }
    }
  };

  useEffect(() => {
    fetch(`/api/children/${id}`)
      .then((res) => {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 404) throw new Error("Not found");
        if (!res.ok) throw new Error(`Failed to load student (status ${res.status})`);
        return res.json();
      })
      .then((data) => {
        setChild(data);
        setLoading(false);
      })
      .catch((e) => {
        setLoading(false);
        if (e.message === "Unauthorized") {
          router.push("/login");
        } else if (e.message === "Not found") {
          setNotFound(true);
        } else {
          setError(e.message);
        }
      });
  }, [id, router]);

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
            href={`/${child.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to {child.name}
          </Link>
          {error && (
            <div
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Edit {child.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChildForm
                onSubmit={handleSubmit}
                defaultValues={{
                  name: child.name,
                  grade: child.grade,
                  gender: child.gender,
                  score: child.score,
                }}
                submitLabel="Save Changes"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
