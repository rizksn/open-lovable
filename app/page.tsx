"use client";

import { useEffect } from "react";

import { AppActivityPanel } from "@/components/apps/AppActivityPanel";
import { AppPreviewPanel } from "@/components/apps/AppPreviewPanel";
import { AppPromptComposer } from "@/components/apps/AppPromptComposer";
import { OutRivalHeader } from "@/components/layout/OutRivalHeader";
import { useAuth } from "@/context/AuthContext";
import { useAppBuilder } from "@/hooks/useAppBuilder";

export default function HomePage() {
  const { user } = useAuth();

  const builder = useAppBuilder({
    user,
    selectedOrganization: null,
  });

  const mode = builder.hasGeneratedApp ? "edit" : "create";

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_34%),linear-gradient(135deg,_#020617_0%,_#050816_45%,_#020617_100%)] text-slate-100">
      <aside className="flex h-screen w-[430px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950/85 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <OutRivalHeader />

        <div className="shrink-0 border-b border-white/10 bg-slate-950/60 px-4 py-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  Public Sandbox
                </p>
                <h2 className="mt-1 text-sm font-semibold text-slate-100">
                  Try the OutRival app builder
                </h2>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {mode}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Generate and refine an app in the live preview. This public view
              is intentionally limited to builder experimentation only.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition ${
                  mode === "create"
                    ? "border border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                    : "border border-white/10 bg-black/20 text-slate-500"
                }`}
              >
                Create app
              </div>

              <div
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition ${
                  mode === "edit"
                    ? "border border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                    : "border border-white/10 bg-black/20 text-slate-500"
                }`}
              >
                Edit app
              </div>
            </div>
          </div>
        </div>

        <AppActivityPanel
          status={builder.status}
          history={builder.history}
          lastFilesWritten={builder.lastFilesWritten}
          mode={mode}
          onUsePrompt={builder.setPrompt}
        />

        <AppPromptComposer
          isAuthenticated={false}
          currentAppId={null}
          mode={mode}
          prompt={builder.prompt}
          hasGeneratedApp={builder.hasGeneratedApp}
          errorMessage={builder.errorMessage}
          isGenerating={builder.isGenerating}
          onOpenSaveModal={() => {}}
          onPromptChange={builder.setPrompt}
          onGenerate={builder.handleGenerate}
          onReset={builder.handleReset}
        />
      </aside>

      <AppPreviewPanel
        isLoadingSelectedApp={builder.isLoadingSelectedApp}
        previewKey={builder.previewKey}
      />
    </main>
  );
}
