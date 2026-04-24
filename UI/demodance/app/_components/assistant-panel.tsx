"use client";

import type { ReactNode } from "react";

type AssistantPanelProps = {
  title: string;
  subtitle: string;
  rightSlot?: ReactNode;
  contextSlot?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
};

export function AssistantPanel({ title, subtitle, rightSlot, contextSlot, body, footer }: AssistantPanelProps) {
  return (
    <aside className="dd-assistant-panel">
      <header className="dd-assistant-header">
        <div>
          <h3 className="text-[39px] font-semibold leading-none tracking-tight">{title}</h3>
          <p className="dd-label-zh mt-2">{subtitle}</p>
        </div>
        {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
      </header>
      {contextSlot ? <div className="px-5 pt-1">{contextSlot}</div> : null}
      <div className="dd-assistant-body">{body}</div>
      {footer ? <div className="dd-assistant-footer">{footer}</div> : null}
    </aside>
  );
}
