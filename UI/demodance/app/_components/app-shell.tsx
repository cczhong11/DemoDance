"use client";

import { ReactNode } from "react";
import { LeftSidebar } from "./left-sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="dd-app-shell">
      <LeftSidebar />
      <div className="dd-main-wrap">{children}</div>
    </div>
  );
}
