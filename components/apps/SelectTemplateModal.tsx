type TemplateSummary = {
  id: string;
  name: string;
  slug: string;
  visibility: "public" | "organization";
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
  } | null;
};

type SelectTemplateModalProps = {
  isOpen: boolean;
  templates: TemplateSummary[];
  selectTemplateError: string | null;
  isLoadingSelectedTemplate: boolean;
  onSelectTemplate: (template: TemplateSummary) => void | Promise<void>;
  onClose: () => void;
};

export function SelectTemplateModal({
  isOpen,
  templates,
  selectTemplateError,
  isLoadingSelectedTemplate,
  onSelectTemplate,
  onClose,
}: SelectTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 m-80 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-20 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold tracking-tight">Select Template</h2>

        <p className="mt-2 text-sm text-slate-500">
          Load a reusable template into the live preview.
        </p>

        {selectTemplateError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {selectTemplateError}
          </p>
        )}

        <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">No templates found.</p>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectTemplate(template)}
                disabled={isLoadingSelectedTemplate}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {template.name}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {template.slug}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {template.visibility === "public" ? "Public" : "Org"}
                  </span>
                </div>
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

export type { TemplateSummary };
