"use client";

import { useMemo, useState } from "react";

type SectionStatus = "idle" | "generating" | "done";

type VideoSection = {
  id: string;
  title: string;
  durationSec: number;
  script: string;
  status: SectionStatus;
  version: number;
};

const INITIAL_SECTIONS: VideoSection[] = [
  {
    id: "problem",
    title: "1. Problem & Motivation",
    durationSec: 18,
    script:
      "Meet builders who can ship products fast but struggle to present them clearly and convincingly.",
    status: "idle",
    version: 0,
  },
  {
    id: "solution",
    title: "2. Solution Introduction",
    durationSec: 10,
    script:
      "Introducing DemoDance, the fastest way to turn raw demos into launch-ready product videos.",
    status: "idle",
    version: 0,
  },
  {
    id: "features",
    title: "3. Features + Prototype",
    durationSec: 30,
    script:
      "First, paste your submission and assets. Next, AI structures scenes and voiceover. Finally, it renders polished clips ready for launch.",
    status: "idle",
    version: 0,
  },
  {
    id: "tech",
    title: "4. Technical Architecture",
    durationSec: 20,
    script:
      "Behind the scenes, a modular pipeline handles prompt composition, script generation, scene rendering, and export orchestration.",
    status: "idle",
    version: 0,
  },
  {
    id: "vision",
    title: "5. Vision",
    durationSec: 15,
    script:
      "Next, DemoDance expands into multilingual narration, template marketplaces, and team-level collaboration workflows.",
    status: "idle",
    version: 0,
  },
  {
    id: "wrap",
    title: "6. Wrap-up",
    durationSec: 6,
    script: "DemoDance: from raw demo to launch-ready, in minutes.",
    status: "idle",
    version: 0,
  },
];

export default function SectionVideoPage() {
  const [sections, setSections] = useState<VideoSection[]>(INITIAL_SECTIONS);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [combining, setCombining] = useState(false);
  const [exportName, setExportName] = useState<string | null>(null);

  const allDone = useMemo(() => sections.every((s) => s.status === "done"), [sections]);

  function updateScript(id: string, script: string) {
    setExportName(null);
    setSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              script,
            }
          : s,
      ),
    );
  }

  async function generateOne(id: string) {
    setExportName(null);
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "generating" } : s)),
    );

    await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 800));

    setSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "done",
              version: s.version + 1,
            }
          : s,
      ),
    );
  }

  async function generateAll() {
    setGeneratingAll(true);
    setExportName(null);
    for (const section of sections) {
      // eslint-disable-next-line no-await-in-loop
      await generateOne(section.id);
    }
    setGeneratingAll(false);
  }

  async function combineAndExport() {
    if (!allDone) return;
    setCombining(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setCombining(false);
    setExportName("DemoDance_final.mp4");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center gap-3">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back
        </a>
        <div className="text-sm font-semibold">Section Video Generation</div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={generateAll}
            disabled={generatingAll}
            className={`text-xs px-3 py-1.5 rounded ${
              generatingAll
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-zinc-800"
            }`}
          >
            {generatingAll ? "Generating..." : "Start Generating All Sections"}
          </button>
          <button
            onClick={combineAndExport}
            disabled={!allDone || combining}
            className={`text-xs px-3 py-1.5 rounded ${
              !allDone || combining
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {combining ? "Combining..." : "Combine & Export"}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          每个 section 可以单独生成或重新生成，全部完成后直接组合导出。
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <section key={section.id} className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{section.title}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Target Duration: {section.durationSec}s</div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    section.status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : section.status === "generating"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {section.status === "done"
                    ? `Done · v${section.version}`
                    : section.status === "generating"
                      ? "Generating"
                      : "Not Generated"}
                </span>
              </div>

              <textarea
                value={section.script}
                onChange={(e) => updateScript(section.id, e.target.value)}
                rows={3}
                className="mt-3 w-full text-[13px] bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-zinc-500"
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => generateOne(section.id)}
                  disabled={section.status === "generating" || generatingAll}
                  className={`text-xs px-3 py-1.5 rounded border ${
                    section.status === "generating" || generatingAll
                      ? "border-zinc-200 text-zinc-400 cursor-not-allowed"
                      : "border-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  {section.status === "done" ? "Regenerate" : "Generate"}
                </button>

                <div className="text-xs text-zinc-500">
                  {section.status === "done"
                    ? "Clip ready for merge"
                    : "Generate this section to create its clip"}
                </div>
              </div>
            </section>
          ))}
        </div>

        {exportName && (
          <div className="mt-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm">
            Export ready: {exportName}
          </div>
        )}
      </main>
    </div>
  );
}

