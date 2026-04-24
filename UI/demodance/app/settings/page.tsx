import { AppShell } from "../_components/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <main className="h-[calc(100vh-32px)] overflow-y-auto">
        <div className="dd-panel p-8 min-h-full">
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="dd-label-zh mt-2">设置中心</p>
          
          <div className="mt-8 max-w-2xl space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4 border-b border-[var(--dd-border-subtle)] pb-2 text-[var(--dd-text-secondary)]">Team Profile</h2>
              <div className="space-y-4">
                <label className="block">
                  <div className="text-sm text-[var(--dd-text-secondary)] mb-1">Team Name</div>
                  <input type="text" className="dd-input" defaultValue="Demo Team" />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 border-b border-[var(--dd-border-subtle)] pb-2 text-[var(--dd-text-secondary)]">Integrations</h2>
              <div className="space-y-4">
                <label className="block">
                  <div className="text-sm text-[var(--dd-text-secondary)] mb-1">OpenAI API Key</div>
                  <input type="password" className="dd-input" defaultValue="sk-................................" />
                  <p className="text-xs text-[var(--dd-text-muted)] mt-1">Used for custom LLM text generation.</p>
                </label>
              </div>
            </section>
            
            <div className="pt-4">
              <button className="dd-btn-primary h-11 px-8">Save Settings</button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
