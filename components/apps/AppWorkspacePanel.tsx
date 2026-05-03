import type { AppBuilderMode, AppWorkspacePermissions } from "@/types/app";
import type { AppRole } from "@/types/auth";

type AppWorkspacePanelProps = {
  mode: AppBuilderMode;
  userRole?: AppRole;
  selectedOrganizationName?: string;
  hasSelectedOrganization: boolean;
  currentAppId: string | null;
  currentAppName: string | null;
  currentAppSlug: string | null;
  hasGeneratedApp: boolean;
  isLoadingApps: boolean;
  currentTemplateId: string | null;
  selectedTemplateName: string | null;
  isLoadingTemplates: boolean;
  status: string;
  publicAppBaseUrl: string;
  permissions: AppWorkspacePermissions;
  onCreateOrganization: () => void;
  onSwitchOrganization: () => void | Promise<void>;
  onClearOrganization?: () => void;
  onSelectApp: () => void | Promise<void>;
  onOpenVersionHistory: () => void;
  onPublishApp: () => void | Promise<void>;
  onOpenDeleteApp: () => void;
  onSelectTemplate: () => void | Promise<void>;
  onOpenDeleteTemplate: () => void;
};

export function AppWorkspacePanel({
  mode,
  userRole,
  selectedOrganizationName,
  hasSelectedOrganization,
  currentAppId,
  currentAppName,
  currentAppSlug,
  hasGeneratedApp,
  isLoadingApps,
  currentTemplateId,
  selectedTemplateName,
  isLoadingTemplates,
  status,
  publicAppBaseUrl,
  permissions,
  onCreateOrganization,
  onSwitchOrganization,
  onClearOrganization,
  onSelectApp,
  onOpenVersionHistory,
  onPublishApp,
  onOpenDeleteApp,
  onSelectTemplate,
  onOpenDeleteTemplate,
}: AppWorkspacePanelProps) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-slate-950/60 px-4 py-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 shadow-lg shadow-black/20">
        <div className="mb-10 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition ${
              mode === "create"
                ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/10"
                : "text-slate-500"
            }`}
          >
            Create
          </button>

          <button
            type="button"
            className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition ${
              mode === "edit"
                ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/10"
                : "text-slate-500"
            }`}
          >
            Edit
          </button>
        </div>

        {userRole && (
          <div className="h-36 mb-4 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Role
              </span>
              <span className="text-sm font-semibold text-slate-200">
                {userRole === "platform_admin"
                  ? "OutRival Admin"
                  : userRole === "editor"
                    ? "Institution Editor"
                    : "Institution Viewer"}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Organization
              </span>

              {(permissions.canCreateOrganization ||
                permissions.canSwitchOrganization) && (
                <div className="flex items-center gap-2">
                  {hasSelectedOrganization && onClearOrganization && (
                    <button
                      type="button"
                      onClick={onClearOrganization}
                      className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-none text-slate-300 transition hover:border-red-300/25 hover:bg-red-400/10 hover:text-red-100"
                    >
                      Clear
                    </button>
                  )}

                  {permissions.canCreateOrganization && (
                    <button
                      type="button"
                      onClick={onCreateOrganization}
                      className="min-h-9 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold leading-none text-cyan-100 transition hover:bg-cyan-300/15 hover:shadow-lg hover:shadow-cyan-300/10"
                    >
                      + Org
                    </button>
                  )}

                  {permissions.canSwitchOrganization && (
                    <button
                      type="button"
                      onClick={onSwitchOrganization}
                      className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-none text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="truncate text-sm font-semibold text-white">
              {selectedOrganizationName ?? "None selected"}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                App
              </span>

              <button
                type="button"
                onClick={onSelectApp}
                disabled={!hasSelectedOrganization || isLoadingApps}
                className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-none text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoadingApps ? "Loading" : "Select"}
              </button>
            </div>

            <p className="truncate text-sm font-semibold pb-4 text-white">
              {currentAppName ?? "New app"}
            </p>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Template
              </span>

              <button
                type="button"
                onClick={onSelectTemplate}
                disabled={isLoadingTemplates}
                className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-none text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoadingTemplates ? "Loading" : "Select"}
              </button>
            </div>

            <p className="truncate pb-4 text-sm font-semibold text-white">
              {selectedTemplateName ?? "Template library"}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {currentAppId && (
                <button
                  type="button"
                  onClick={onOpenVersionHistory}
                  className="h-24 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-12 text-xs font-bold text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
                >
                  Version History
                </button>
              )}

              {hasSelectedOrganization &&
                currentAppId &&
                hasGeneratedApp &&
                permissions.canPublishApp && (
                  <button
                    type="button"
                    onClick={onPublishApp}
                    disabled={status === "validating"}
                    className="h-24 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 pl-12 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Publish
                  </button>
                )}

              {currentAppId && permissions.canDeleteApp && (
                <button
                  type="button"
                  onClick={onOpenDeleteApp}
                  className="h-24 w-full rounded-lg border border-red-400/20 bg-red-400/10 pl-12 text-xs font-bold text-red-200 transition hover:border-red-300/30 hover:bg-red-400/15"
                >
                  Delete App
                </button>
              )}
            </div>

            {currentAppSlug && (
              <a
                href={`${publicAppBaseUrl}/published/${currentAppSlug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-10 flex h-24 w-full items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Launch Application
              </a>
            )}

            {currentTemplateId && userRole === "platform_admin" && (
              <button
                type="button"
                onClick={onOpenDeleteTemplate}
                className="mt-3 h-24 w-full flex items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 text-xs font-bold text-red-200 transition hover:border-red-300/30 hover:bg-red-400/15"
              >
                Delete Template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
