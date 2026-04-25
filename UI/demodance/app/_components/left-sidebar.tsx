"use client";

import Link from "next/link";
import Image from "next/image";
import logoImage from "../../public/logo.png";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  id: string;
  href: string;
  labelEn: string;
  labelZh: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    id: "home",
    href: "/onboarding",
    labelEn: "Home",
    labelZh: "首页",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="dd-nav-icon">
        <path fill="currentColor" d="M12 3.2 2.8 10.8V21h6.6v-6.2h5.2V21h6.6V10.8z" />
      </svg>
    ),
  },
  {
    id: "projects",
    href: "/projects",
    labelEn: "Projects",
    labelZh: "项目管理",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="dd-nav-icon">
        <path fill="currentColor" d="M3.5 7.2A2.2 2.2 0 0 1 5.7 5h6l1.6 1.7H18a2.5 2.5 0 0 1 2.5 2.5v8.3A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z" />
      </svg>
    ),
  },
  {
    id: "templates",
    href: "/templates",
    labelEn: "Templates",
    labelZh: "模板中心",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="dd-nav-icon">
        <path fill="currentColor" d="M4.5 6h15v3.2h-15zm0 4.6h15v3.2h-15zm0 4.6h15v3.2h-15z" />
      </svg>
    ),
  },
  {
    id: "brand",
    href: "/brand",
    labelEn: "Brand Kit",
    labelZh: "品牌中心",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="dd-nav-icon">
        <path fill="currentColor" d="M12 4.2A7.8 7.8 0 0 0 4.2 12 7.8 7.8 0 1 0 12 4.2m0 4.2a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2" />
      </svg>
    ),
  },
  {
    id: "settings",
    href: "/settings",
    labelEn: "Settings",
    labelZh: "设置中心",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="dd-nav-icon">
        <path
          fill="currentColor"
          d="m20 13.5.1-1.5-2-.7a6.8 6.8 0 0 0-.5-1.1l.9-1.9-1.2-1.2-1.9.9a7.8 7.8 0 0 0-1-.5l-.8-2h-1.7l-.7 2a7.8 7.8 0 0 0-1.1.5l-1.9-.9L6 8.3l.9 1.9a6.8 6.8 0 0 0-.5 1.1l-2 .7.1 1.5 2 .8c.1.4.3.7.5 1l-.9 2L7.3 19l1.8-.9c.4.2.8.4 1.2.5l.7 2h1.7l.8-2a6.4 6.4 0 0 0 1.1-.5l1.9.9 1.2-1.2-.9-2 .5-1.1zm-8 1.4A2.9 2.9 0 1 1 12 9a2.9 2.9 0 0 1 0 5.9"
        />
      </svg>
    ),
  },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const showProPlan = pathname !== "/onboarding";
  
  let activeNavId = "home";
  if (pathname.startsWith("/projects")) activeNavId = "projects";
  else if (pathname.startsWith("/templates")) activeNavId = "templates";
  else if (pathname.startsWith("/brand")) activeNavId = "brand";
  else if (pathname.startsWith("/settings")) activeNavId = "settings";

  return (
    <aside className="dd-sidebar">
      <div className="dd-sidebar-logo">
        <div className="w-8 h-8 flex shrink-0 items-center justify-center mr-2">
          <Image src={logoImage} alt="DemoDance Logo" width={28} height={28} className="w-auto h-7 object-contain" unoptimized />
        </div>
        <div className="dd-logo-text">DemoDance</div>
        <button type="button" className="dd-collapse-btn" aria-label="Collapse sidebar">
          ‹‹
        </button>
      </div>

      <nav className="dd-sidebar-card">
        {navItems.map((item) => {
          const active = item.id === activeNavId;
          return (
            <Link
              key={`${item.id}-${item.labelEn}`}
              href={item.href}
              className={`dd-nav-item ${active ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              <span className="leading-tight">
                <span className="dd-nav-label-en">{item.labelEn}</span>
                <span className="dd-nav-label-zh">{item.labelZh}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {showProPlan ? (
        <section className="dd-sidebar-card">
          <div className="flex items-center gap-2">
            <span className="dd-pro-badge" aria-hidden>
              ★
            </span>
            <div>
              <div className="dd-nav-label-en">Pro Plan</div>
              <div className="dd-nav-label-zh">专业版</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-[var(--dd-text-secondary)]">Unlimited exports</div>
          <div className="text-sm text-[var(--dd-text-muted)] zh-only">无限导出</div>
          <button type="button" className="dd-btn-primary mt-4 h-11 w-full text-sm">
            Upgrade Plan
          </button>
        </section>
      ) : null}

      <section className="dd-sidebar-card mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="dd-team-avatar">D</span>
            <div>
              <div className="dd-nav-label-en">Demo Team</div>
              <div className="dd-nav-label-zh">演示团队</div>
            </div>
          </div>
          <span className="text-[var(--dd-text-muted)]">⌄</span>
        </div>
        <div className="mt-4 text-sm text-[var(--dd-text-secondary)]">3 members</div>
        <div className="text-sm text-[var(--dd-text-muted)] zh-only">3 位成员</div>
        <button type="button" className="dd-btn-secondary mt-4 h-11 w-full text-sm">
          Invite Members
        </button>
      </section>
    </aside>
  );
}
