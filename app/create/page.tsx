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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Child) => {
    setLoading(true);
    try {
      const newChild = await addChildAction(data);
      router.push(`/${newChild.id}`);
    } catch {
      router.push("/login");
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/leaderboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Leaderboard
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Add Student</CardTitle>
            </CardHeader>
            <CardContent>
              <ChildForm onSubmit={handleSubmit} submitLabel={loading ? "Adding..." : "Add Student"} />
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
