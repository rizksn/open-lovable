type AppBuilderMode = "create" | "edit";

type AppPromptComposerProps = {
  isAuthenticated: boolean;
  canSave: boolean;
  canSaveTemplate: boolean;
  currentAppId: string | null;
  mode: AppBuilderMode;
  prompt: string;
  hasGeneratedApp: boolean;
  errorMessage: string | null;
  isGenerating: boolean;
  onOpenSaveModal?: () => void;
  onOpenSaveTemplateModal?: () => void;
  onPromptChange: (value: string) => void;
  onGenerate: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
};

export function AppPromptComposer({
  isAuthenticated,
  canSave,
  canSaveTemplate,
  currentAppId,
  mode,
  prompt,
  hasGeneratedApp,
  errorMessage,
  isGenerating,
  onOpenSaveModal,
  onOpenSaveTemplateModal,
  onPromptChange,
  onGenerate,
  onReset,
}: AppPromptComposerProps) {
  return (
    <>
      {isAuthenticated && canSave && (
        <button
          type="button"
          onClick={() => onOpenSaveModal?.()}
          className="ml-6 mt-3 block h-24 w-full rounded-lg bg-cyan-300 pl-20 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-300/10 transition hover:bg-cyan-200"
        >
          {currentAppId ? "Save new version" : "Save app"}
        </button>
      )}

      {isAuthenticated && canSaveTemplate && (
        <button
          type="button"
          onClick={() => onOpenSaveTemplateModal?.()}
          className="ml-6 mt-3 block h-24 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 pl-20 text-sm font-bold text-emerald-200 shadow-lg shadow-emerald-400/10 transition hover:bg-emerald-400/15"
        >
          Save template
        </button>
      )}

      <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-4 py-4 shadow-[0_-24px_50px_rgba(0,0,0,0.32)]">
        <div className="rounded-lg border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/30">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <label className="px-15 py-10 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              {mode === "edit" ? "Describe your edit" : "Describe your app"}
            </label>

            <span className="rounded-md border border-white/10 bg-black/20 px-20 py-5 font-mono text-[10px] text-slate-500">
              OutRival
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder={
              hasGeneratedApp
                ? "Describe the change you want..."
                : "Describe the app you want to build..."
            }
            className="h-[104px] w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:bg-slate-950 focus:ring-4 focus:ring-cyan-300/10"
          />

          {errorMessage && (
            <div className="mt-3 mb-4 rounded-lg border border-red-300/20 bg-red-400/[0.08] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs mt-4 mb-6 font-bold text-red-100">
                  Generation failed
                </p>

                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(errorMessage)}
                  className="text-xs font-bold text-red-100/60 transition hover:text-red-100"
                >
                  Copy
                </button>
              </div>

              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-black/35 p-2.5 font-mono text-[11px] leading-relaxed text-red-100/75">
                {errorMessage}
              </pre>
            </div>
          )}

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={onGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="h-30 rounded-lg bg-cyan-300 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-300/10 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isGenerating
                ? mode === "edit"
                  ? "Applying..."
                  : "Generating..."
                : mode === "edit"
                  ? "Apply edit"
                  : "Generate"}
            </button>

            <button
              type="button"
              onClick={onReset}
              disabled={isGenerating}
              className="h-30 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
