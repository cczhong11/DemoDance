"use client";

import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[rgba(2,6,15,0.94)] text-white grid place-items-center p-6">
      <section className="w-full max-w-5xl rounded-2xl border border-[rgba(121,137,167,0.3)] bg-[rgba(7,13,24,0.92)] shadow-[0_20px_70px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="px-6 md:px-8 pt-6 md:pt-7 pb-4 border-b border-[rgba(121,137,167,0.25)] flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">DemoDance</h1>
            <p className="mt-1 text-sm md:text-base text-[rgba(224,231,255,0.78)]">Watch a quick showcase before entering the workflow.</p>
          </div>
          <button
            type="button"
            className="h-10 px-4 rounded-xl bg-white text-black font-medium hover:opacity-90"
            onClick={() => router.push("/onboarding")}
          >
            Enter
          </button>
        </div>

        <div className="p-4 md:p-6">
          <video
            src="/api/recordings/after"
            controls
            autoPlay
            muted
            playsInline
            className="w-full rounded-xl border border-[rgba(121,137,167,0.25)] bg-black"
          />
        </div>
      </section>
    </main>
  );
}
