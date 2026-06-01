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

  const handleSubmit = async (data: Child) => {
    if (!child) return;
    try {
      await updateChildAction(child.id, data);
      router.push(`/${child.id}`);
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
            href={`/${child.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to {child.name}
          </Link>
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
