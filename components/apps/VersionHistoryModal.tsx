type AppVersion = {
  id: string;
  versionNumber: number;
  prompt: string;
  createdAt: string;
};

type VersionHistoryModalProps = {
  isOpen: boolean;
  currentAppName: string | null;
  versionHistoryError: string | null;
  isLoadingVersions: boolean;
  versions: AppVersion[];
  isLoadingSelectedVersion: boolean;
  onLoadVersion: (versionNumber: number) => void | Promise<void>;
  onClose: () => void;
};

export function VersionHistoryModal({
  isOpen,
  currentAppName,
  versionHistoryError,
  isLoadingVersions,
  versions,
  isLoadingSelectedVersion,
  onLoadVersion,
  onClose,
}: VersionHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-26 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold tracking-tight">Version History</h2>

        <p className="mt-2 text-sm text-slate-500">
          {currentAppName ?? "Selected app"}
        </p>

        {versionHistoryError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {versionHistoryError}
          </p>
        )}

        <div className="mt-20 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {isLoadingVersions ? (
            <p className="text-sm text-slate-500">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-slate-500">No versions found.</p>
          ) : (
            versions.map((version, index) => (
              <div
                key={version.id}
                className="rounded-lg border border-white/10 bg-white/[0.05] mb-10 px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="pb-10 pl-10 text-sm font-bold text-white">
                      v{version.versionNumber}{" "}
                      {index === 0 && (
                        <span className="text-xs font-semibold text-cyan-300">
                          Latest
                        </span>
                      )}
                    </p>

                    <p className="mt-1 ml-10 line-clamp-2 text-xs text-slate-500">
                      {version.prompt}
                    </p>

                    <p className="mt-2 ml-10 text-[11px] font-medium text-slate-600">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLoadVersion(version.versionNumber)}
                    disabled={isLoadingSelectedVersion}
                    className="h-20 rounded-lg bg-cyan-300 px-20 mr-10 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
                  >
                    Load
                  </button>
                </div>
              </div>
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
