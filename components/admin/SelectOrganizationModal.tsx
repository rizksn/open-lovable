type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type SelectOrganizationModalProps = {
  isOpen: boolean;
  organizations: OrganizationSummary[];
  isLoadingOrganizations: boolean;
  onSelectOrganization: (organization: OrganizationSummary) => void;
  onClose: () => void;
};

export function SelectOrganizationModal({
  isOpen,
  organizations,
  isLoadingOrganizations,
  onSelectOrganization,
  onClose,
}: SelectOrganizationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-20 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl pb-10 font-bold tracking-tight">
          Select Organization
        </h2>

        <div className="mt-5 max-h-[360px] space-y-8 overflow-y-auto pr-1">
          {isLoadingOrganizations ? (
            <p className="text-sm text-slate-500">Loading organizations...</p>
          ) : organizations.length === 0 ? (
            <p className="text-sm text-slate-500">No organizations found.</p>
          ) : (
            organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                onClick={() => onSelectOrganization(organization)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-16 py-3.5 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
              >
                <p className="text-sm font-bold text-white">
                  {organization.name}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {organization.slug}
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
