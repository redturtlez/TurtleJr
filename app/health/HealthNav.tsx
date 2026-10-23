"use client";

import { Apple, BarChart3, Bell, CalendarCheck, ChefHat, Dumbbell, Flag, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./health.module.css";

const views = [
  { href: "/health", label: "Today", icon: CalendarCheck },
  { href: "/health/goals", label: "Goals", icon: Flag },
  { href: "/health/nutrition", label: "Nutrition", icon: Apple },
  { href: "/health/planning", label: "Plan", icon: ChefHat },
  { href: "/health/wellness", label: "Move & Create", icon: Dumbbell },
  { href: "/health/insights", label: "Insights", icon: BarChart3 },
  { href: "/health/notifications", label: "Notify", icon: Bell },
  { href: "/health/configure", label: "Configure", icon: Settings2 },
] as const;

export default function HealthNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav aria-label="Life Dashboard views">
      {views.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} prefetch={false} onMouseEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)} className={pathname === href ? styles.activeTab : ""}>
          <Icon />{label}
        </Link>
      ))}
    </nav>
  );
}
