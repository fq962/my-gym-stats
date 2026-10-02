"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoy", icon: DumbbellIcon },
  { href: "/calendario", label: "Calendario", icon: CalendarIcon },
  { href: "/progreso", label: "Progreso", icon: ChartIcon },
  { href: "/rutina", label: "Rutina", icon: ListIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/dia")
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-muted active:text-text"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { className?: string };

function DumbbellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" d="M6.5 8.5v7M4 10v4M17.5 8.5v7M20 10v4M8 12h8" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path strokeLinecap="round" d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

function ListIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 16v-4M12.5 16V8M17 16v-6" />
    </svg>
  );
}
