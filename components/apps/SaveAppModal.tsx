type SaveAppModalProps = {
  isOpen: boolean;
  currentAppId: string | null;
  currentAppName: string | null;
  selectedOrganizationName?: string;
  appName: string;
  saveAppError: string | null;
  isSavingApp: boolean;
  onAppNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SaveAppModal({
  isOpen,
  currentAppId,
  currentAppName,
  selectedOrganizationName,
  appName,
  saveAppError,
  isSavingApp,
  onAppNameChange,
  onClose,
  onSave,
}: SaveAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold tracking-tight">
          {currentAppId ? "Save new version" : "Name your app"}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {currentAppId
            ? `This will save a new version of ${currentAppName ?? "this app"}.`
            : `This app will be saved under ${selectedOrganizationName ?? "this institution"}.`}
        </p>

        {!currentAppId && (
          <input
            value={appName}
            onChange={(e) => onAppNameChange(e.target.value)}
            placeholder="App name"
            className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
          />
        )}

        {saveAppError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {saveAppError}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSavingApp || (!currentAppId && !appName.trim())}
            className="h-11 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {isSavingApp
              ? "Saving..."
              : currentAppId
                ? "Save version"
                : "Save app"}
          </button>
        </div>
      </div>
    </div>
  );
}
