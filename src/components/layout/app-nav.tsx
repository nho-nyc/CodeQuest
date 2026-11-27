"use client";

import { BarChart3, ShieldCheck, UsersRound, UserPlus, Brain, CirclePlay, Code2, FlaskConical, Hammer, Home, Map as MapIcon, Medal, Swords, Target, Trophy, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LIVE = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: MapIcon },
  { href: "/practice", label: "Practice", icon: Code2 },
  { href: "/visualizer", label: "Visualizer", icon: CirclePlay },
  { href: "/counterexample-lab", label: "Lab", icon: FlaskConical },
  { href: "/repair-workshop", label: "Repair", icon: Hammer },
  { href: "/review", label: "Review", icon: Brain },
  { href: "/quests", label: "Quests", icon: Target },
  { href: "/contests", label: "Contests", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/friends", label: "Friends", icon: UserPlus },
  { href: "/groups", label: "Groups", icon: UsersRound },
  { href: "/achievements", label: "Achievements", icon: Medal },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

/** The bottom bar only has room for five tabs. Quests and achievements are reached from the dashboard and profile. */
const MOBILE = ["/dashboard", "/learn", "/practice", "/contests", "/profile"];

export function SidebarNav({ isStaff = false }: { isStaff?: boolean }) {
  const path = usePathname();
  const items = isStaff ? [...LIVE, { href: "/admin", label: "Admin", icon: ShieldCheck }] : LIVE;
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition",
              active ? "border-sky bg-sky/10 text-sky" : "border-transparent text-muted hover:bg-surface-2",
            )}
          >
            <Icon size={24} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {LIVE.filter((l) => MOBILE.includes(l.href)).map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-extrabold uppercase", active ? "text-sky" : "text-muted")}>
            <Icon size={24} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
