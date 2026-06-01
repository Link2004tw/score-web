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
import type { Child } from "@/lib/schemas";
import type { StoredChild } from "@/lib/store";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [child, setChild] = useState<StoredChild | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/children/${id}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data: StoredChild | null | undefined) => {
        if (data) setChild(data);
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (data: Child) => {
    if (!child) return;
    await updateChildAction(child.id, data);
    router.push(`/${child.id}`);
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;

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
          <Link href={`/${child.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
