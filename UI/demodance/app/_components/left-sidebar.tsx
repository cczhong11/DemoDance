"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  labelEn: string;
  labelZh: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    href: "/onboarding",
    labelEn: "Home",
    labelZh: "首页",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="currentColor" d="M12 3 3 10.2V21h6.4v-5.9h5.2V21H21V10.2z" />
      </svg>
    ),
  },
  {
    href: "/workflow",
    labelEn: "Projects",
    labelZh: "项目管理",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="currentColor" d="M4 6.5A2.5 2.5 0 0 1 6.5 4H12l2 2h3.5A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" />
      </svg>
    ),
  },
  {
    href: "/generate",
    labelEn: "Templates",
    labelZh: "模板中心",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="currentColor" d="M5 6h14v3H5zm0 4.5h14v3H5zM5 15h14v3H5z" />
      </svg>
    ),
  },
  {
    href: "/workflow",
    labelEn: "Brand Kit",
    labelZh: "品牌中心",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="currentColor" d="M12 4a8 8 0 1 0 8 8h-8z" />
        <circle cx="12" cy="12" r="3.1" fill="currentColor" opacity=".55" />
      </svg>
    ),
  },
  {
    href: "/workflow",
    labelEn: "Settings",
    labelZh: "设置中心",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="currentColor" d="m20.1 13.5.1-1.5-1.8-.7a6.8 6.8 0 0 0-.5-1.2l.8-1.8-1.1-1.1-1.8.8a6.8 6.8 0 0 0-1.2-.5L13.5 3h-1.5l-.7 1.8a6.8 6.8 0 0 0-1.2.5l-1.8-.8-1.1 1.1.8 1.8a6.8 6.8 0 0 0-.5 1.2L3.9 12l.1 1.5 1.8.7c.1.4.3.8.5 1.2l-.8 1.8 1.1 1.1 1.8-.8c.4.2.8.4 1.2.5l.7 1.8h1.5l.7-1.8c.4-.1.8-.3 1.2-.5l1.8.8 1.1-1.1-.8-1.8c.2-.4.4-.8.5-1.2zM12.8 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
      </svg>
    ),
  },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    (href === "/workflow" && (pathname === "/workflow-v2" || pathname.startsWith("/workflow/")));

  return (
    <aside className="w-[270px] shrink-0 px-4 py-4">
      <div className="dd-sidebar h-full flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[var(--dd-accent-gradient)]/90 grid place-items-center shadow-[0_6px_20px_rgba(109,77,255,0.35)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white">
                <path fill="currentColor" d="M5 4h6.7a6.6 6.6 0 0 1 0 13.2H5z" />
                <path fill="currentColor" opacity=".8" d="M12.2 4H19v16h-6.8a8 8 0 1 0 0-16" />
              </svg>
            </div>
            <div className="text-[36px] font-semibold leading-none tracking-tight">DemoDance</div>
          </div>
          <button className="text-[var(--dd-text-muted)] hover:text-[var(--dd-text-secondary)] text-xl">‹‹</button>
        </div>

        <nav className="dd-card-subtle p-2.5 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={`${item.href}-${item.labelEn}`}
                href={item.href}
                className={`dd-transition rounded-xl px-3 py-2.5 flex items-center gap-3 border ${
                  active
                    ? "dd-nav-item-active text-white border-[rgba(124,92,255,0.66)]"
                    : "border-transparent text-[var(--dd-text-secondary)] hover:bg-white/5 hover:border-[rgba(124,92,255,0.24)]"
                }`}
              >
                <span className={`text-sm opacity-90 ${active ? "text-white" : "text-[var(--dd-text-muted)]"}`}>{item.icon}</span>
                <span className="leading-tight">
                  <span className="block text-[15px]">{item.labelEn}</span>
                  <span className="block text-xs text-[var(--dd-text-muted)]">{item.labelZh}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="dd-card-subtle p-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="h-6 w-6 rounded-md bg-[rgba(255,193,72,0.18)] text-[#f9d477] grid place-items-center">★</span>
            <span>Pro Plan</span>
          </div>
          <div className="text-xs text-[var(--dd-text-muted)] mt-2">Unlimited exports</div>
          <div className="text-xs text-[var(--dd-text-muted)]">无限导出</div>
          <button className="dd-btn-primary mt-3 h-10 w-full text-sm">Upgrade Plan</button>
        </div>

        <div className="dd-card-subtle p-3.5 mt-auto">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[rgba(124,92,255,0.32)] text-white grid place-items-center text-xs font-semibold">D</div>
            <div>
              <div className="text-sm font-medium">Demo Team</div>
              <div className="text-xs text-[var(--dd-text-muted)]">演示团队</div>
            </div>
          </div>
          <div className="text-xs text-[var(--dd-text-muted)] mt-3">3 members / 3 位成员</div>
          <button className="dd-btn-secondary mt-3 h-10 w-full text-sm">Invite Members</button>
        </div>
      </div>
    </aside>
  );
}
