"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ChatMsg } from "../home/types";
import { type DemoVideoMeta, type SectionRender, useWorkflowStore } from "../_state/workflow-store";

type ProjectCardProps = {
  id: string;
  name: string;
  status: string;
  updatedAtLabel: string;
};

type LoadedProjectResponse = {
  projectId?: string | null;
  projectName?: string;
  submission?: string;
  demoVideo?: unknown;
  activeStepId?: string;
  fieldValues?: Record<string, string>;
  stepScripts?: Record<string, string>;
  chat?: unknown[];
  renderSections?: unknown[];
};

export function ProjectCard({ id, name, status, updatedAtLabel }: ProjectCardProps) {
  const router = useRouter();
  const { loadProject } = useWorkflowStore();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data = (await response.json()) as LoadedProjectResponse & { error?: string; details?: string };
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to load project");
      }

      loadProject({
        projectId: typeof data.projectId === "string" ? data.projectId : id,
        projectName: typeof data.projectName === "string" ? data.projectName : name,
        submission: typeof data.submission === "string" ? data.submission : "",
        demoVideo:
          data.demoVideo &&
          typeof data.demoVideo === "object" &&
          typeof (data.demoVideo as DemoVideoMeta).name === "string" &&
          typeof (data.demoVideo as DemoVideoMeta).size === "number"
            ? (data.demoVideo as DemoVideoMeta)
            : null,
        activeStepId:
          data.activeStepId === "audience" ||
          data.activeStepId === "importance" ||
          data.activeStepId === "product" ||
          data.activeStepId === "features" ||
          data.activeStepId === "tech" ||
          data.activeStepId === "impact"
            ? data.activeStepId
            : "audience",
        fieldValues: data.fieldValues ?? {},
        stepScripts: data.stepScripts ?? {},
        chat: (Array.isArray(data.chat) ? data.chat : []) as ChatMsg[],
        renderSections: (Array.isArray(data.renderSections) ? data.renderSections : []) as SectionRender[],
      });

      router.push("/workflow");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`dd-sidebar-card cursor-pointer p-5 text-left transition-colors hover:border-[var(--dd-brand-purple)] ${
        loading ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      <div className="mb-4 grid h-32 place-items-center rounded-lg border border-[var(--dd-border-subtle)] bg-[rgba(255,255,255,0.03)]">
        <span className="text-4xl">🎬</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className="rounded-full border border-[var(--dd-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--dd-text-muted)]">
          {status}
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--dd-text-muted)]">{loading ? "Loading project..." : updatedAtLabel}</p>
    </button>
  );
}
