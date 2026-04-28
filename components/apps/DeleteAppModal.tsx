type DeleteAppModalProps = {
  isOpen: boolean;
  currentAppName: string | null;
  deleteAppError: string | null;
  isDeletingApp: boolean;
  onDelete: () => void | Promise<void>;
  onClose: () => void;
};

export function DeleteAppModal({
  isOpen,
  currentAppName,
  deleteAppError,
  isDeletingApp,
  onDelete,
  onClose,
}: DeleteAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-red-400/20 bg-slate-950 p-30 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold tracking-tight mb-10">Delete app?</h2>

        <p className="mt-2 text-m leading-relaxed text-slate-500">
          This will permanently delete{" "}
          <span className="font-semibold text-slate-200">
            {currentAppName ?? "this app"}
          </span>{" "}
          and all saved versions. This action cannot be undone.
        </p>

        {deleteAppError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {deleteAppError}
          </p>
        )}

        <div className="mt-30 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-28 rounded-xl border border-white/10 bg-white/[0.06] px-20 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isDeletingApp}
            className="h-28 rounded-lg bg-red-400 px-20 text-sm font-bold text-white transition hover:bg-red-300 disabled:opacity-50"
          >
            {isDeletingApp ? "Deleting..." : "Delete app"}
          </button>
        </div>
      </div>
    </div>
  );
}
