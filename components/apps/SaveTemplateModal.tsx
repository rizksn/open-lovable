type TemplateVisibility = "public" | "organization";

type SaveTemplateModalProps = {
  isOpen: boolean;
  selectedOrganizationName?: string;
  templateName: string;
  visibility: TemplateVisibility;
  saveTemplateError: string | null;
  isSavingTemplate: boolean;
  canSaveOrganizationTemplate: boolean;
  onTemplateNameChange: (value: string) => void;
  onVisibilityChange: (value: TemplateVisibility) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SaveTemplateModal({
  isOpen,
  selectedOrganizationName,
  templateName,
  visibility,
  saveTemplateError,
  isSavingTemplate,
  canSaveOrganizationTemplate,
  onTemplateNameChange,
  onVisibilityChange,
  onClose,
  onSave,
}: SaveTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-40 text-white shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold tracking-tight">Save template</h2>

        <p className="mt-18 mb-10 text-sm leading-relaxed text-slate-500">
          Save the current generated app as a reusable template. Templates do
          not create versions.
        </p>

        <input
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          placeholder="Template name"
          className="mt-5 mb-20 h-30 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
        />

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onVisibilityChange("public")}
            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
              visibility === "public"
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
            }`}
          >
            <div className="font-bold">Public template</div>
            <div className="mt-1 text-xs text-slate-500">
              Available to all institution editors.
            </div>
          </button>

          {canSaveOrganizationTemplate && (
            <button
              type="button"
              onClick={() => onVisibilityChange("organization")}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                visibility === "organization"
                  ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              <div className="font-bold">Organization template</div>
              <div className="mt-1 text-xs text-slate-500">
                Available only to{" "}
                {selectedOrganizationName ?? "this organization"}.
              </div>
            </button>
          )}
        </div>

        {saveTemplateError && (
          <p className="mt-3 text-sm font-medium text-red-300">
            {saveTemplateError}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-30 rounded-lg border border-white/10 bg-white/[0.06] px-20 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSavingTemplate || !templateName.trim()}
            className="h-30 rounded-lg bg-cyan-300 px-20 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {isSavingTemplate ? "Saving..." : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}
