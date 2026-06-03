"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChildForm } from "@/components/ChildForm";
import { addChildAction } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { Child } from "@/lib/schemas";

export default function CreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Child) => {
    try {
      const newChild = await addChildAction(data);
      router.push(`/${newChild.id}`);
    } catch (e) {
      if (e instanceof Error && e.name === "AuthError") {
        router.push("/login");
      } else {
        setError(e instanceof Error ? e.message : "Failed to add student. Please try again.");
      }
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Leaderboard
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
              <CardTitle>Add Student</CardTitle>
            </CardHeader>
            <CardContent>
              <ChildForm onSubmit={handleSubmit} submitLabel="Add Student" />
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
