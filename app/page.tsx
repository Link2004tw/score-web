"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Scoreboard</h1>

        {user ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>Signed in as {user.displayName || user.email}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Link href="/leaderboard" className="flex-1">
                  <Button className="w-full" size="lg">View Leaderboard</Button>
                </Link>
                <Link href="/create" className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">Add Student</Button>
                </Link>
              </CardContent>
            </Card>
            <Button variant="ghost" onClick={handleLogout} className="w-full">
              Logout
            </Button>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Login or create an account to continue</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="flex-1">
                <Button className="w-full" size="lg">Login</Button>
              </Link>
              <Link href="/signup" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">Sign Up</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
