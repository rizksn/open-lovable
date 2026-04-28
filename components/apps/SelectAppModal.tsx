type AppSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  organization_id: string;
  created_at: string;
};

type SelectAppModalProps = {
  isOpen: boolean;
  organizationName?: string;
  apps: AppSummary[];
  selectAppError: string | null;
  isLoadingSelectedApp: boolean;
  onSelectApp: (app: AppSummary) => void | Promise<void>;
  onClose: () => void;
};

export function SelectAppModal({
  isOpen,
  organizationName,
  apps,
  selectAppError,
  isLoadingSelectedApp,
  onSelectApp,
  onClose,
}: SelectAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-20 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold tracking-tight">Select App</h2>

        <p className="mt-2 text-sm text-slate-500">
          Apps under {organizationName}
        </p>

        {selectAppError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {selectAppError}
          </p>
        )}

        <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {apps.length === 0 ? (
            <p className="text-sm text-slate-500">No apps found.</p>
          ) : (
            apps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => onSelectApp(app)}
                disabled={isLoadingSelectedApp}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <p className="text-sm font-bold text-white">{app.name}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {app.slug}
                </p>
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-20 h-28 w-full rounded-xl border border-white/10 bg-yellow-500/50 px-16 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
