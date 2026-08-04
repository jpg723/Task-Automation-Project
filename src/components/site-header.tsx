"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Triangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/projects", label: "프로젝트 관리" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex h-full items-center gap-9">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background">
              <Triangle className="size-3" fill="currentColor" strokeWidth={0} />
            </span>
            Jira Tracker
          </Link>
          <nav className="flex h-full items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "-mb-px flex h-full items-center border-b-2 text-sm font-medium transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
