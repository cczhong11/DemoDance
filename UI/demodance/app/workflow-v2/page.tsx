"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";

const tabs = [
  { id: 1, title: "Target User & Problem", subtitle: "目标用户与问题" },
  { id: 2, title: "Why It Matters", subtitle: "为什么重要" },
  { id: 3, title: "Product Intro", subtitle: "产品介绍" },
  { id: 4, title: "Features", subtitle: "核心功能" },
  { id: 5, title: "Tech Stack", subtitle: "技术栈" },
  { id: 6, title: "Future Impact", subtitle: "未来影响" },
];

export default function WorkflowV2Page() {
  const [active, setActive] = useState(3);
  const [name, setName] = useState("DemoDance");
  const [slogan, setSlogan] = useState("Make every demo dance.");
  const [script, setScript] = useState(
    "DemoDance helps teams create stunning product demos in minutes.\nNo editing skills. No complex tools. Just your story, beautifully told.",
  );

  const completion = useMemo(() => {
    const fields = [name.trim(), slogan.trim(), script.trim()];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [name, slogan, script]);

  return (
    <AppShell>
      <main className="h-full grid grid-cols-[1fr_360px] gap-4">
        <section className="dd-card p-4 md:p-5 overflow-hidden">
          <header className="dd-card-subtle p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-7 w-7 rounded-full border border-[rgba(165,186,255,0.3)] grid place-items-center text-xs">1</span>
                <span className="text-[var(--dd-text-muted)]">Onboarding</span>
              </div>
              <div className="h-px w-10 bg-[rgba(165,186,255,0.3)]" />
              <div className="flex items-center gap-2 text-sm">
                <span className="h-7 w-7 rounded-full dd-pill-active grid place-items-center text-xs">2</span>
                <span>Script & Collaborate</span>
              </div>
              <div className="h-px w-10 bg-[rgba(165,186,255,0.3)]" />
              <div className="flex items-center gap-2 text-sm">
                <span className="h-7 w-7 rounded-full border border-[rgba(165,186,255,0.3)] grid place-items-center text-xs">3</span>
                <span className="text-[var(--dd-text-muted)]">Generate & Export</span>
              </div>
            </div>
            <div className="dd-card-subtle px-2 py-1 text-xs text-[var(--dd-text-secondary)]">EN / 中文</div>
          </header>

          <div className="mt-3 grid grid-cols-6 gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={`rounded-xl text-left p-2 border dd-transition ${
                    isActive
                      ? "dd-pill-active"
                      : "border-[rgba(165,186,255,0.16)] bg-[rgba(19,29,49,0.35)] hover:bg-[rgba(19,29,49,0.55)]"
                  }`}
                >
                  <div className="text-xs text-[var(--dd-text-secondary)]">{tab.id}</div>
                  <div className="text-sm mt-0.5">{tab.title}</div>
                  <div className="text-[11px] text-[var(--dd-text-muted)]">{tab.subtitle}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 dd-card-subtle p-4">
            <div className="grid grid-cols-[1fr_300px] gap-4">
              <label className="block">
                <div className="text-xs text-[var(--dd-text-secondary)]">Project Name / 项目名称</div>
                <input className="dd-input mt-1 w-full px-3" defaultValue="DemoDance Product Demo" />
              </label>
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--dd-text-secondary)]">
                  <span>Completion</span>
                  <span>{completion}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[rgba(165,186,255,0.12)] overflow-hidden">
                  <div className="h-full" style={{ width: `${completion}%`, background: "var(--dd-accent-gradient)" }} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-2xl font-semibold">Product Intro (Logo / Name / Slogan)</h2>
              <p className="text-sm text-[var(--dd-text-secondary)] mt-1">Introduce your product with a compelling name, slogan and opening script.</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label>
                <div className="text-xs text-[var(--dd-text-secondary)]">Product Name</div>
                <input className="dd-input mt-1 w-full px-3" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="text-xs text-[var(--dd-text-muted)] mt-1">{name.length} / 60</div>
              </label>
              <label>
                <div className="text-xs text-[var(--dd-text-secondary)]">Slogan</div>
                <input className="dd-input mt-1 w-full px-3" value={slogan} onChange={(e) => setSlogan(e.target.value)} />
                <div className="text-xs text-[var(--dd-text-muted)] mt-1">{slogan.length} / 80</div>
              </label>
            </div>

            <div className="mt-3 grid grid-cols-[260px_1fr] gap-3">
              <div className="dd-card-subtle p-3">
                <div className="text-xs text-[var(--dd-text-secondary)] mb-2">Logo</div>
                <div className="rounded-xl border border-dashed border-[rgba(165,186,255,0.22)] bg-[rgba(7,13,24,0.85)] h-36 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg">D DemoDance</div>
                  </div>
                </div>
                <button className="dd-btn-secondary mt-3 h-10 w-full text-sm">Generate Logo</button>
              </div>

              <label className="block">
                <div className="text-xs text-[var(--dd-text-secondary)]">Script / Narration</div>
                <textarea className="dd-textarea mt-1 w-full min-h-52 px-3 py-2" value={script} onChange={(e) => setScript(e.target.value)} />
                <div className="text-xs text-[var(--dd-text-muted)] mt-1">{script.length} / 2000</div>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Link href="/onboarding" className="dd-btn-secondary h-10 px-4 text-sm inline-flex items-center">Previous</Link>
              <Link href="/generate" className="dd-btn-primary h-10 px-5 text-sm inline-flex items-center">Next</Link>
            </div>
          </div>
        </section>

        <aside className="dd-card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">AI Copilot</h3>
            <div className="text-xs text-[var(--dd-text-muted)]">智能助手</div>
          </div>
          <div className="mt-3 dd-card-subtle p-2 text-sm text-[var(--dd-text-secondary)]">Context: Product Intro</div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="dd-card-subtle p-3 text-sm text-[var(--dd-text-secondary)]">
              Your product intro looks great. Would you like help making the slogan more impactful?
            </div>
            <div className="ml-8 dd-pill-active p-3 text-sm text-white">Yes, make it more punchy.</div>
            <div className="dd-card-subtle p-3 text-sm text-[var(--dd-text-secondary)]">
              Try options: Demos that move. Results that stick. / From idea to impact.
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {['Rewrite', 'Shorter', 'More punchy', 'More professional'].map((chip) => (
              <button key={chip} className="dd-btn-secondary h-8 px-3 text-xs">{chip}</button>
            ))}
          </div>

          <div className="mt-3">
            <textarea className="dd-textarea w-full min-h-24 px-3 py-2" placeholder="Ask anything about this section..." />
            <div className="text-xs text-[var(--dd-text-muted)] mt-1">Enter to send · Shift+Enter for new line</div>
          </div>
        </aside>
      </main>
    </AppShell>
  );
}
