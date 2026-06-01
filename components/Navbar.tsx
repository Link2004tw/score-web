"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Scoreboard
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Leaderboard
          </Link>
          <Link href="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Add Student
          </Link>
          <Link href="/score" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Score
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user.displayName || user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
