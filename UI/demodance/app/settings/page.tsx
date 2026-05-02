"use client";

import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { maskApiKey, readBrowserOpenAIApiKey, writeBrowserOpenAIApiKey } from "../_lib/browser-settings";

export default function SettingsPage() {
  const [teamName, setTeamName] = useState("Demo Team");
  const [openaiApiKey, setOpenaiApiKey] = useState(() => readBrowserOpenAIApiKey());
  const [saveMessage, setSaveMessage] = useState("");

  const maskedPreview = useMemo(() => maskApiKey(openaiApiKey), [openaiApiKey]);

  function handleSave() {
    writeBrowserOpenAIApiKey(openaiApiKey);
    setSaveMessage(openaiApiKey.trim() ? "Saved in this browser." : "Cleared from this browser.");
  }

  return (
    <AppShell>
      <main className="h-[calc(100vh-32px)] overflow-y-auto">
        <div className="dd-panel min-h-full p-8">
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="dd-label-zh mt-2">设置中心</p>

          <div className="mt-8 max-w-2xl space-y-8">
            <section>
              <h2 className="mb-4 border-b border-[var(--dd-border-subtle)] pb-2 text-xl font-semibold text-[var(--dd-text-secondary)]">
                Team Profile
              </h2>
              <div className="space-y-4">
                <label className="block">
                  <div className="mb-1 text-sm text-[var(--dd-text-secondary)]">Team Name</div>
                  <input type="text" className="dd-input" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-4 border-b border-[var(--dd-border-subtle)] pb-2 text-xl font-semibold text-[var(--dd-text-secondary)]">
                Integrations
              </h2>
              <div className="space-y-4">
                <label className="block">
                  <div className="mb-1 text-sm text-[var(--dd-text-secondary)]">OpenAI API Key</div>
                  <input
                    type="password"
                    className="dd-input"
                    value={openaiApiKey}
                    onChange={(event) => setOpenaiApiKey(event.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="mt-1 text-xs text-[var(--dd-text-muted)]">
                    Stored only in this browser and sent with OpenAI-backed requests from this device.
                  </p>
                  <p className="mt-1 text-xs text-[var(--dd-text-secondary)]">
                    Current value: {maskedPreview || "Not set"}
                  </p>
                </label>
              </div>
            </section>

            <div className="pt-4">
              <button type="button" className="dd-btn-primary h-11 px-8" onClick={handleSave}>
                Save Settings
              </button>
              {saveMessage ? <p className="mt-3 text-sm text-[var(--dd-text-secondary)]">{saveMessage}</p> : null}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
