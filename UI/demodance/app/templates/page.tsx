import { AppShell } from "../_components/app-shell";

export default function TemplatesPage() {
  return (
    <AppShell>
      <main className="h-[calc(100vh-32px)] overflow-y-auto">
        <div className="dd-panel p-8 min-h-full">
          <h1 className="text-4xl font-bold">Templates</h1>
          <p className="dd-label-zh mt-2">模板中心</p>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            {["SaaS Launch", "Mobile App", "DevTools", "E-commerce"].map((t) => (
              <div key={t} className="dd-sidebar-card p-5 border-dashed hover:border-[var(--dd-brand-purple)] cursor-pointer transition-colors">
                <div className="h-40 rounded-lg bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.1)] mb-4 grid place-items-center">
                  <span className="text-4xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="text-sm text-[var(--dd-text-muted)] mt-1">Free Template</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
