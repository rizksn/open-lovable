type AppBuilderMode = "create" | "edit";

type AppBuilderStatus =
  | "idle"
  | "generating"
  | "validating"
  | "success"
  | "error";

type HistoryItem = {
  id: string;
  mode: AppBuilderMode;
  prompt: string;
  filesWritten: string[];
};

type AppActivityPanelProps = {
  status: AppBuilderStatus;
  history: HistoryItem[];
  lastFilesWritten: string[];
  mode: AppBuilderMode;
  onUsePrompt: (prompt: string) => void;
};

export function AppActivityPanel({
  status,
  history,
  lastFilesWritten,
  mode,
  onUsePrompt,
}: AppActivityPanelProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="flex min-h-full flex-col justify-end gap-3">
        {status !== "idle" && (
          <div className="inline-flex h-8 w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-medium text-slate-300 shadow-lg shadow-black/20">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            {status === "generating" && "Generating code..."}
            {status === "validating" && "Validating build..."}
            {status === "success" && "Ready"}
            {status === "error" && "Failed"}
          </div>
        )}

        {history.length === 0 && lastFilesWritten.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.035] p-5 text-center shadow-lg shadow-black/20">
            <p className="text-sm font-semibold text-slate-200">
              No activity yet
            </p>
            <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-slate-500">
              Generated apps, edits, and saved file changes will appear here.
            </p>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Activity
              </p>
              <p className="text-[11px] font-medium text-slate-600">
                {history.length} run{history.length === 1 ? "" : "s"}
              </p>
            </div>

            {[...history].reverse().map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 shadow-lg shadow-black/20 transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-100">
                    {item.mode}
                  </span>

                  <span className="text-[11px] font-medium text-slate-500">
                    {item.filesWritten.length} file
                    {item.filesWritten.length === 1 ? "" : "s"}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-300">
                  {item.prompt}
                </p>

                <button
                  type="button"
                  onClick={() => onUsePrompt(item.prompt)}
                  className="mt-3 h-8 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  Use prompt
                </button>
              </div>
            ))}
          </div>
        )}

        {lastFilesWritten.length > 0 && (
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-emerald-100">
                {mode === "edit" ? "Updated files" : "Generated files"}
              </p>

              <span className="rounded-full border border-emerald-300/15 bg-black/25 px-2.5 py-1 text-[11px] font-bold text-emerald-100/70">
                {lastFilesWritten.length}
              </span>
            </div>

            <div className="mt-3 max-h-24 space-y-1.5 overflow-y-auto pr-1">
              {lastFilesWritten.map((file) => (
                <p
                  key={file}
                  className="truncate rounded-lg border border-white/5 bg-black/25 px-2.5 py-1.5 font-mono text-[11px] text-emerald-100/75"
                >
                  {file}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
