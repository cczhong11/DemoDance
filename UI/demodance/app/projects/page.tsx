import { AppShell } from "../_components/app-shell";
import { butterbaseRequest } from "@/lib/server/butterbase/client";
import { NewProjectButton } from "./new-project-button";
import { ProjectCard } from "./project-card";

type ButterbaseProject = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  updated_at?: unknown;
  created_at?: unknown;
  archived_at?: unknown;
  metadata?: unknown;
};

type ButterbaseListResponse =
  | ButterbaseProject[]
  | {
      data?: unknown;
      items?: unknown;
      results?: unknown;
    };

type ProjectCard = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
};

function readProjectArray(payload: ButterbaseListResponse): ButterbaseProject[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data as ButterbaseProject[];
  if (Array.isArray(payload.items)) return payload.items as ButterbaseProject[];
  if (Array.isArray(payload.results)) return payload.results as ButterbaseProject[];
  return [];
}

function formatRelativeDate(isoLike: string): string {
  const value = Date.parse(isoLike);
  if (Number.isNaN(value)) return "Updated recently";

  const diffMs = Date.now() - value;
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "Updated today";
  if (diffDays === 1) return "Updated 1 day ago";
  if (diffDays < 7) return `Updated ${diffDays} days ago`;

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))}`;
}

async function loadProjects(): Promise<ProjectCard[]> {
  const payload = await butterbaseRequest<ButterbaseListResponse>("/projects", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return readProjectArray(payload)
    .filter((project) => !project.archived_at)
    .map((project) => ({
      id: typeof project.id === "string" && project.id ? project.id : crypto.randomUUID(),
      name: typeof project.name === "string" && project.name.trim() ? project.name.trim() : "Untitled Project",
      status: typeof project.status === "string" && project.status.trim() ? project.status.trim() : "draft",
      updatedAt:
        typeof project.updated_at === "string" && project.updated_at
          ? project.updated_at
          : typeof project.created_at === "string" && project.created_at
            ? project.created_at
            : "",
    }))
    .sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""));
}

export default async function ProjectsPage() {
  let projects: ProjectCard[] = [];
  let errorMessage = "";

  try {
    projects = await loadProjects();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load projects";
  }

  return (
    <AppShell>
      <main className="h-[calc(100vh-32px)] overflow-y-auto">
        <div className="dd-panel min-h-full p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Projects</h1>
              <p className="dd-label-zh mt-2">项目管理</p>
            </div>
            <NewProjectButton />
          </div>

          {errorMessage ? (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
              Failed to load Butterbase projects: {errorMessage}
            </div>
          ) : null}

          {projects.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-[var(--dd-border-subtle)] bg-[rgba(255,255,255,0.02)] px-6 py-10 text-center">
              <div className="text-4xl">🎬</div>
              <h2 className="mt-4 text-xl font-semibold">No projects yet</h2>
              <p className="mt-2 text-sm text-[var(--dd-text-muted)]">Projects saved through DemoDance will appear here from Butterbase.</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  status={project.status}
                  updatedAtLabel={formatRelativeDate(project.updatedAt)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
