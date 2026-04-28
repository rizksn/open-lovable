type CreateOrganizationModalProps = {
  isOpen: boolean;
  organizationName: string;
  organizationSlug: string;
  organizationError: string | null;
  isCreatingOrganization: boolean;
  onOrganizationNameChange: (value: string) => void;
  onOrganizationSlugChange: (value: string) => void;
  onCreateOrganization: () => void | Promise<void>;
  onClose: () => void;
};

export function CreateOrganizationModal({
  isOpen,
  organizationName,
  organizationSlug,
  organizationError,
  isCreatingOrganization,
  onOrganizationNameChange,
  onOrganizationSlugChange,
  onCreateOrganization,
  onClose,
}: CreateOrganizationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-30 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl mb-18 font-bold tracking-tight">
          Create Organization
        </h2>

        <input
          value={organizationName}
          onChange={(e) => onOrganizationNameChange(e.target.value)}
          placeholder="Organization name"
          className="mt-5 mb-8 h-38 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
        />

        <input
          value={organizationSlug}
          onChange={(e) => onOrganizationSlugChange(e.target.value)}
          placeholder="Slug (e.g. umich)"
          className="mt-3 mb-20 h-38 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
        />

        {organizationError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {organizationError}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-28 rounded-lg border border-white/10 bg-white/[0.06] px-20 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onCreateOrganization}
            disabled={isCreatingOrganization}
            className="h-28 rounded-lg bg-cyan-300 px-20 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {isCreatingOrganization ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
