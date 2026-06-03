"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const tabs = [
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M6 20V10" />
        <path d="M12 20V4" />
        <path d="M18 20V14" />
        <path d="M18 14l-6-6-6 6" />
      </svg>
    ),
  },
  {
    href: "/create",
    label: "Add",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20v-2a5 5 0 015-5h4a5 5 0 015 5v2" />
        <path d="M15 7l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/score",
    label: "Score",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    href: "/attendance",
    label: "Attend",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/logs",
    label: "Logs",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-12 md:h-14 max-w-2xl items-center justify-between px-4 md:px-8 pt-[var(--safe-area-top)]">
          <Link href="/" className="text-base md:text-lg font-bold tracking-tight">
            Scoreboard
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`text-sm transition-colors ${
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {user.displayName || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xs md:hidden pb-[var(--safe-area-bottom)]">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-0 flex-1 max-w-20 transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] leading-tight font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
