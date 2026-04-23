"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

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
    icon: <span aria-hidden>⌂</span>,
  },
  {
    href: "/workflow",
    labelEn: "Projects",
    labelZh: "项目管理",
    icon: <span aria-hidden>□</span>,
  },
  {
    href: "/generate",
    labelEn: "Templates",
    labelZh: "模板中心",
    icon: <span aria-hidden>≡</span>,
  },
  {
    href: "/workflow",
    labelEn: "Brand Kit",
    labelZh: "品牌中心",
    icon: <span aria-hidden>◎</span>,
  },
  {
    href: "/workflow",
    labelEn: "Settings",
    labelZh: "设置中心",
    icon: <span aria-hidden>⚙</span>,
  },
];

export function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[250px] shrink-0 px-4 py-4">
      <div className="dd-card h-full flex flex-col p-4 gap-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-lg dd-pill-active flex items-center justify-center text-sm">D</div>
          <div>
            <div className="text-[30px] leading-none">DemoDance</div>
          </div>
        </div>

        <nav className="dd-card-subtle p-2 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.labelEn}`}
                href={item.href}
                className={`dd-transition rounded-xl px-3 py-2.5 flex items-center gap-3 ${
                  active ? "dd-pill-active text-white" : "text-[var(--dd-text-secondary)] hover:bg-white/5"
                }`}
              >
                <span className="text-sm opacity-90">{item.icon}</span>
                <span className="leading-tight">
                  <span className="block text-sm">{item.labelEn}</span>
                  <span className="block text-xs text-[var(--dd-text-muted)]">{item.labelZh}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="dd-card-subtle p-3">
          <div className="text-sm font-medium">Pro Plan</div>
          <div className="text-xs text-[var(--dd-text-muted)] mt-1">Unlimited exports / 无限导出</div>
          <button className="dd-btn-primary mt-3 h-10 w-full text-sm">Upgrade Plan</button>
        </div>

        <div className="dd-card-subtle p-3 mt-auto">
          <div className="text-sm font-medium">Demo Team</div>
          <div className="text-xs text-[var(--dd-text-muted)] mt-1">3 members</div>
          <button className="dd-btn-secondary mt-3 h-10 w-full text-sm">Invite Members</button>
        </div>
      </div>
    </aside>
  );
}
