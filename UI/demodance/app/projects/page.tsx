import { AppShell } from "../_components/app-shell";

export default function ProjectsPage() {
  return (
    <AppShell>
      <main className="h-[calc(100vh-32px)] overflow-y-auto">
        <div className="dd-panel p-8 min-h-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Projects</h1>
              <p className="dd-label-zh mt-2">项目管理</p>
            </div>
            <button className="dd-btn-primary h-11 px-6">New Project</button>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dd-sidebar-card p-5 cursor-pointer hover:border-[var(--dd-brand-purple)] transition-colors">
                <div className="h-32 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--dd-border-subtle)] mb-4 grid place-items-center">
                  <span className="text-4xl">🎬</span>
                </div>
                <h3 className="text-lg font-semibold">Demo Project {i}</h3>
                <p className="text-sm text-[var(--dd-text-muted)] mt-1">Updated 2 days ago</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
