"use client";

import { ReactNode } from "react";
import { LeftSidebar } from "./left-sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex">
      <LeftSidebar />
      <div className="flex-1 min-w-0 px-4 py-4 pr-5">{children}</div>
    </div>
  );
}
