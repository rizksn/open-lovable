type AppPreviewPanelProps = {
  isLoadingSelectedApp: boolean;
  previewKey: string | number;
};

export function AppPreviewPanel({
  isLoadingSelectedApp,
  previewKey,
}: AppPreviewPanelProps) {
  return (
    <section className="min-w-0 flex-1 overflow-hidden p-5">
      <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-3 flex shrink-0 items-center justify-between px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Live Preview
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              Generated application canvas
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
            <span className="px-5 font-mono text-[11px] text-slate-400">
              OutRival
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
          {isLoadingSelectedApp ? (
            <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400">
              Loading app preview...
            </div>
          ) : (
            <iframe
              key={previewKey}
              src={`http://localhost:5173?preview=${previewKey}`}
              className="h-full w-full border-0"
              title="Generated App Preview"
            />
          )}
        </div>
      </div>
    </section>
  );
}
