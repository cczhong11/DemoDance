import { AppShell } from "../_components/app-shell";

export default function BrandKitPage() {
  return (
    <AppShell>
      <main className="h-[calc(100vh-32px)] overflow-y-auto">
        <div className="dd-panel p-8 min-h-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Brand Kit</h1>
              <p className="dd-label-zh mt-2">品牌中心</p>
            </div>
            <button className="dd-btn-primary h-11 px-6">Add Brand Asset</button>
          </div>
          
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4 text-[var(--dd-text-secondary)]">Logos</h2>
            <div className="flex gap-4">
               <div className="w-32 h-32 rounded-xl bg-white grid place-items-center shadow-lg cursor-pointer">
                 <span className="text-[var(--dd-bg-page)] font-bold text-2xl">Logo</span>
               </div>
               <div className="w-32 h-32 rounded-xl bg-black border border-[var(--dd-border-default)] grid place-items-center shadow-lg cursor-pointer">
                 <span className="text-white font-bold text-2xl">Logo</span>
               </div>
            </div>
          </div>
          
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4 text-[var(--dd-text-secondary)]">Colors</h2>
            <div className="flex gap-4">
               <div className="w-16 h-16 rounded-full bg-[#7b4dff] shadow-lg cursor-pointer ring-2 ring-offset-2 ring-offset-[var(--dd-bg-card)] ring-transparent hover:ring-[#7b4dff] transition-all"></div>
               <div className="w-16 h-16 rounded-full bg-[#3d7dff] shadow-lg cursor-pointer ring-2 ring-offset-2 ring-offset-[var(--dd-bg-card)] ring-transparent hover:ring-[#3d7dff] transition-all"></div>
               <div className="w-16 h-16 rounded-full bg-[#58c878] shadow-lg cursor-pointer ring-2 ring-offset-2 ring-offset-[var(--dd-bg-card)] ring-transparent hover:ring-[#58c878] transition-all"></div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
