"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthButton } from "@/components/auth/AuthButton";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { RequireRole } from "@/components/auth/RequireRole";

type HistoryItem = {
  id: string;
  prompt: string;
  mode: "create" | "edit";
  filesWritten: string[];
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type AppSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  organization_id: string;
  created_at: string;
};

type AppVersionSummary = {
  id: string;
  versionNumber: number;
  prompt: string;
  storagePath: string;
  createdAt: string;
};

export default function AdminHomePage() {
  const { user } = useAuth();
  const router = useRouter();

  /* Builder state */
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedApp, setHasGeneratedApp] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastFilesWritten, setLastFilesWritten] = useState<string[]>([]);
  const [latestPrompt, setLatestPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "generating" | "validating" | "error" | "success"
  >("idle");

  /* Organization state */
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);

  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isSelectOrgOpen, setIsSelectOrgOpen] = useState(false);

  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(
    null,
  );

  /* App state */
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [currentAppSlug, setCurrentAppSlug] = useState<string | null>(null);
  const [currentAppName, setCurrentAppName] = useState<string | null>(null);

  /* Save app modal state */
  const [isSaveAppOpen, setIsSaveAppOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [saveAppError, setSaveAppError] = useState<string | null>(null);

  /* Select app modal state */
  const [isSelectAppOpen, setIsSelectAppOpen] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isLoadingSelectedApp, setIsLoadingSelectedApp] = useState(false);
  const [selectAppError, setSelectAppError] = useState<string | null>(null);

  /* Version history modal state */
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<AppVersionSummary[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isLoadingSelectedVersion, setIsLoadingSelectedVersion] =
    useState(false);
  const [versionHistoryError, setVersionHistoryError] = useState<string | null>(
    null,
  );

  /* Delete app modal state */
  const [isDeleteAppOpen, setIsDeleteAppOpen] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [deleteAppError, setDeleteAppError] = useState<string | null>(null);

  const mode = hasGeneratedApp ? "edit" : "create";

  /**
   * Loads all organizations the current admin can choose from.
   * Used to populate the organization selector.
   */
  async function fetchOrganizations() {
    setIsLoadingOrganizations(true);

    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();

      if (data.success) {
        setOrganizations(data.organizations);
      }
    } finally {
      setIsLoadingOrganizations(false);
    }
  }

  /**
   * Creates a new organization, selects it immediately,
   * and resets the currently selected app because we are now working
   * inside a different organization context.
   */
  async function handleCreateOrganization() {
    if (!organizationName.trim() || !organizationSlug.trim()) return;

    setIsCreatingOrganization(true);
    setOrganizationError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: organizationSlug.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setOrganizationError(data.error ?? "Failed to create organization");
        return;
      }

      setOrganizationName("");
      setOrganizationSlug("");
      setIsCreateOrgOpen(false);

      if (data.organization) {
        setSelectedOrganization(data.organization);

        // Clear selected app because apps are scoped to organizations.
        setCurrentAppId(null);
        setCurrentAppSlug(null);
        setCurrentAppName(null);
        setApps([]);
      }

      await fetchOrganizations();
    } catch (err) {
      setOrganizationError("Something went wrong");
    } finally {
      setIsCreatingOrganization(false);
    }
  }

  /**
   * Generates a new app or edits the current generated app.
   * Writes files into the temporary generated-app workspace,
   * then updates preview/history state.
   */
  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;

    const submittedPrompt = prompt.trim();
    const submittedMode = hasGeneratedApp ? "edit" : "create";

    setIsGenerating(true);
    setErrorMessage(null);
    setStatus("generating");

    try {
      const response = await fetch("/api/outrival-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: submittedPrompt,
          isEdit: hasGeneratedApp,
        }),
      });

      setStatus("validating");

      const data = await response.json();

      if (!response.ok) {
        console.warn("[outrival-generate] request failed", data);

        const message =
          data.validationError ||
          data.details ||
          data.error ||
          "Generation failed";

        setLastFilesWritten([]);
        setErrorMessage(message);
        setStatus("error");
        return;
      }

      const filesWritten = data.filesWritten ?? [];
      setLatestPrompt(submittedPrompt);

      setLastFilesWritten(filesWritten);

      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          prompt: submittedPrompt,
          mode: submittedMode,
          filesWritten,
        },
        ...prev,
      ]);

      setHasGeneratedApp(true);
      setPreviewKey((key) => key + 1);
      setPrompt("");
      setStatus("success");
    } catch (error) {
      console.warn("[outrival-generate] unexpected client error", error);

      setLastFilesWritten([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected generation error",
      );

      setStatus("error");
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * Saves the current generated app.
   *
   * If this is a new app, the backend creates the app row,
   * creates version v1, and snapshots generated-app.
   *
   * If this is an existing app, the backend creates a new app_versions row
   * and snapshots generated-app as the next version.
   */
  async function handleSaveApp() {
    if (!user) return;

    const promptToSave =
      latestPrompt || prompt || `Saved version of ${currentAppName ?? "app"}`;

    setIsSavingApp(true);
    setSaveAppError(null);

    try {
      if (currentAppId) {
        const res = await fetch(`/api/apps/${currentAppId}/versions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptToSave,
            files: lastFilesWritten,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setSaveAppError(data.error ?? "Failed to save app version.");
          return;
        }

        setIsSaveAppOpen(false);
        setAppName("");

        return;
      }

      if (!selectedOrganization) {
        alert("Please select an organization before saving an app.");
        return;
      }

      if (!appName.trim()) {
        setSaveAppError("App name is required.");
        return;
      }

      const payload = {
        organizationId: selectedOrganization.id,
        name: appName.trim(),
        prompt: latestPrompt,
        files: lastFilesWritten,
      };

      const res = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setSaveAppError(data.error ?? "Failed to save app.");
        return;
      }

      setCurrentAppId(data.appId);
      setCurrentAppSlug(data.slug);
      setCurrentAppName(appName.trim());

      setIsSaveAppOpen(false);
      setAppName("");
      setSaveAppError(null);
      setStatus("success");
    } finally {
      setIsSavingApp(false);
    }
  }

  async function handleSelectApp(app: AppSummary) {
    setIsLoadingSelectedApp(true);
    setSelectAppError(null);
    setErrorMessage(null);
    setStatus("validating");

    try {
      const res = await fetch(`/api/apps/${app.id}/latest-version`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSelectAppError(data.error ?? "Failed to load app.");
        setStatus("error");
        return;
      }

      setCurrentAppId(data.app.id);
      setCurrentAppSlug(data.app.slug);
      setCurrentAppName(data.app.name);

      setLastFilesWritten(
        Array.isArray(data.files)
          ? data.files.map((file: { path: string }) => file.path)
          : [],
      );

      setHistory([]);
      setPrompt("");
      setHasGeneratedApp(true);
      setStatus("success");
      setIsSelectAppOpen(false);

      // give Vite a moment to detect/rebuild after hydration
      await new Promise((resolve) => setTimeout(resolve, 300));
      // force iframe reload only after hydration route succeeds
      setPreviewKey((key) => key + 1);
    } catch (error) {
      console.error("[handleSelectApp] failed:", error);
      setSelectAppError("Something went wrong while loading the app.");
      setStatus("error");
    } finally {
      setIsLoadingSelectedApp(false);
    }
  }

  async function handleOpenVersionHistory() {
    if (!currentAppId) return;

    setIsLoadingVersions(true);
    setVersionHistoryError(null);
    setIsVersionHistoryOpen(true);

    try {
      const res = await fetch(`/api/apps/${currentAppId}/versions`);
      const data = await res.json();

      if (!data.success) {
        setVersionHistoryError(data.error ?? "Failed to load versions.");
        return;
      }

      setVersions(data.versions ?? []);
    } finally {
      setIsLoadingVersions(false);
    }
  }

  async function handleLoadVersion(versionNumber: number) {
    if (!currentAppId) return;

    setIsLoadingSelectedVersion(true);
    setVersionHistoryError(null);

    try {
      const res = await fetch(
        `/api/apps/${currentAppId}/versions/${versionNumber}`,
      );
      const data = await res.json();

      if (!data.success) {
        setVersionHistoryError(data.error ?? "Failed to load version.");
        return;
      }

      setLatestPrompt(data.version?.prompt ?? "");
      setPreviewKey((key) => key + 1);
      setIsVersionHistoryOpen(false);
      setStatus("success");
    } finally {
      setIsLoadingSelectedVersion(false);
    }
  }

  async function handlePublishApp() {
    if (!currentAppId) return;

    setErrorMessage(null);
    setStatus("validating");

    try {
      const res = await fetch(`/api/apps/${currentAppId}/publish`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error ?? "Failed to publish app.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (error) {
      console.error("[handlePublishApp] failed:", error);
      setErrorMessage("Something went wrong while publishing the app.");
      setStatus("error");
    }
  }

  async function handleDeleteApp() {
    if (!currentAppId) return;

    setIsDeletingApp(true);
    setDeleteAppError(null);
    setIsDeleteAppOpen(false);

    try {
      const res = await fetch(`/api/apps/${currentAppId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        setDeleteAppError(data.error ?? "Failed to delete app.");
        return;
      }

      const resetRes = await fetch("/api/generated-app/reset", {
        method: "POST",
      });

      const resetData = await resetRes.json();

      if (!resetData.success) {
        setDeleteAppError(
          resetData.error ?? "App deleted, but preview reset failed.",
        );
        return;
      }

      setCurrentAppId(null);
      setCurrentAppSlug(null);
      setCurrentAppName(null);
      setHasGeneratedApp(false);
      setHistory([]);
      setLastFilesWritten([]);
      setLatestPrompt("");
      setVersions([]);
      setDeleteAppError(null);
      setPreviewKey((key) => key + 1);

      if (selectedOrganization) {
        await fetchAppsForSelectedOrganization();
      }
    } finally {
      setIsDeletingApp(false);
    }
  }

  /**
   * Loads apps for the currently selected organization
   * and opens the app selector modal.
   */
  async function fetchAppsForSelectedOrganization() {
    if (!selectedOrganization) return;

    setIsLoadingApps(true);
    setSelectAppError(null);

    try {
      const res = await fetch(
        `/api/apps?organizationId=${selectedOrganization.id}`,
      );
      const data = await res.json();

      if (!data.success) {
        setSelectAppError(data.error ?? "Failed to fetch apps.");
        return;
      }

      setApps(data.apps ?? []);
      setIsSelectAppOpen(true);
    } finally {
      setIsLoadingApps(false);
    }
  }
  function clearBuilderState() {
    setStatus("idle");
    setPrompt("");
    setHasGeneratedApp(false);
    setHistory([]);
    setLastFilesWritten([]);
    setErrorMessage(null);
    setCurrentAppId(null);
    setCurrentAppSlug(null);
    setCurrentAppName(null);
    setApps([]);
    setIsSelectAppOpen(false);
    setIsSaveAppOpen(false);
    setAppName("");
    setSaveAppError(null);
  }

  /**
   * Loads organizations when the admin page first mounts.
   */
  useEffect(() => {
    fetchOrganizations();
  }, []);

  /**
   * When the user logs out, reset the temporary generated-app workspace
   * and clear local builder/admin state.
   */
  useEffect(() => {
    async function resetOnLogout() {
      if (!user) {
        await fetch("/api/generated-app/reset", { method: "POST" });
        clearBuilderState();
      }
    }

    resetOnLogout();
  }, [user]);

  /**
   * Manually resets the temporary generated-app workspace
   * and clears the current builder/admin state.
   */
  async function handleReset() {
    await fetch("/api/generated-app/reset", { method: "POST" });

    clearBuilderState();
  }

  return (
    <RequireRole allowedRoles={["platform_admin"]}>
      <main className="flex h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_34%),linear-gradient(135deg,_#020617_0%,_#050816_45%,_#020617_100%)] text-slate-100">
        <aside className="flex h-screen w-[430px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950/85 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.2)]">
                    <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                      OutRival
                    </h1>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      AI application workspace
                    </p>
                  </div>
                </div>
              </div>

              <AuthButton />
            </div>
          </div>

          <div className="shrink-0 border-b border-white/10 bg-slate-950/60 px-4 py-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 shadow-lg shadow-black/20">
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
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

              {user && (
                <div className="mb-4 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Role
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {user.role === "platform_admin"
                        ? "OutRival Admin"
                        : "Institution User"}
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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateOrgOpen(true)}
                        className="min-h-9 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold leading-none text-cyan-100 transition hover:bg-cyan-300/15 hover:shadow-lg hover:shadow-cyan-300/10"
                      >
                        + Org
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await fetchOrganizations();
                          setIsSelectOrgOpen(true);
                        }}
                        className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-none text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <p className="truncate text-sm font-semibold text-white">
                    {selectedOrganization?.name ?? "None selected"}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      App
                    </span>

                    <button
                      type="button"
                      onClick={fetchAppsForSelectedOrganization}
                      disabled={!selectedOrganization || isLoadingApps}
                      className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-none text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isLoadingApps ? "Loading" : "Select"}
                    </button>
                  </div>

                  <p className="truncate text-sm font-semibold pb-4 text-white">
                    {currentAppName ?? "New app"}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {currentAppId && (
                      <button
                        type="button"
                        onClick={handleOpenVersionHistory}
                        className="h-24 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-12 text-xs font-bold text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
                      >
                        Version History
                      </button>
                    )}

                    {selectedOrganization &&
                      currentAppId &&
                      hasGeneratedApp && (
                        <button
                          type="button"
                          onClick={handlePublishApp}
                          disabled={status === "validating"}
                          className="h-24 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 pl-12 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Publish
                        </button>
                      )}

                    {currentAppId && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteAppError(null);
                          setIsDeleteAppOpen(true);
                        }}
                        className="h-24 w-full rounded-lg border border-red-400/20 bg-red-400/10 pl-12 text-xs font-bold text-red-200 transition hover:border-red-300/30 hover:bg-red-400/15"
                      >
                        Delete App
                      </button>
                    )}
                  </div>

                  {currentAppSlug && (
                    <a
                      href={`/apps/${currentAppSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-10 flex h-24 w-full items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15"
                    >
                      Open public app
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                    Generated apps, edits, and saved file changes will appear
                    here.
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
                        onClick={() => setPrompt(item.prompt)}
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

          {user && (
            <button
              type="button"
              onClick={() => {
                setSaveAppError(null);
                setIsSaveAppOpen(true);
              }}
              className="ml-6 mt-3 block h-24 w-full rounded-lg bg-cyan-300 pl-20 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-300/10 transition hover:bg-cyan-200"
            >
              {currentAppId ? "Save new version" : "Save app"}
            </button>
          )}

          <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-4 py-4 shadow-[0_-24px_50px_rgba(0,0,0,0.32)]">
            <div className="rounded-lg border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/30">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <label className="px-15 py-10 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {mode === "edit" ? "Describe your edit" : "Describe your app"}
                </label>

                <span className="rounded-md border border-white/10 bg-black/20 px-20 py-5 font-mono text-[10px] text-slate-500">
                  OutRival
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  hasGeneratedApp
                    ? "Describe the change you want..."
                    : "Describe the app you want to build..."
                }
                className="h-[104px] w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:bg-slate-950 focus:ring-4 focus:ring-cyan-300/10"
              />

              {errorMessage && (
                <div className="mt-3 rounded-xl border border-red-300/20 bg-red-400/[0.08] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-red-100">
                      Generation failed
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(errorMessage)
                      }
                      className="text-xs font-bold text-red-100/60 transition hover:text-red-100"
                    >
                      Copy
                    </button>
                  </div>

                  <pre className="mt-2 max-h-20 overflow-auto whitespace-pre-wrap rounded-lg bg-black/35 p-2.5 font-mono text-[11px] leading-relaxed text-red-100/75">
                    {errorMessage}
                  </pre>
                </div>
              )}

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="h-30 rounded-lg bg-cyan-300 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-300/10 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGenerating
                    ? mode === "edit"
                      ? "Applying..."
                      : "Generating..."
                    : mode === "edit"
                      ? "Apply edit"
                      : "Generate"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isGenerating}
                  className="h-30 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Create Organization modal */}
        {isCreateOrgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">
                Create Organization
              </h2>

              <input
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Organization name"
                className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
              />

              <input
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value)}
                placeholder="Slug (e.g. umich)"
                className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
              />

              {organizationError && (
                <p className="mt-3 text-sm font-medium text-red-300">
                  {organizationError}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setOrganizationName("");
                    setOrganizationSlug("");
                    setOrganizationError(null);
                    setIsCreateOrgOpen(false);
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateOrganization}
                  disabled={isCreatingOrganization}
                  className="h-11 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
                >
                  {isCreatingOrganization ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Select Organization modal */}
        {isSelectOrgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-20 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl pb-10 font-bold tracking-tight">
                Select Organization
              </h2>

              <div className="mt-5 max-h-[360px] space-y-8 overflow-y-auto pr-1">
                {isLoadingOrganizations ? (
                  <p className="text-sm text-slate-500">
                    Loading organizations...
                  </p>
                ) : organizations.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No organizations found.
                  </p>
                ) : (
                  organizations.map((organization) => (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrganization(organization);
                        setCurrentAppId(null);
                        setCurrentAppSlug(null);
                        setCurrentAppName(null);
                        setApps([]);
                        setIsSelectOrgOpen(false);
                      }}
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
                onClick={() => setIsSelectOrgOpen(false)}
                className="mt-20 h-28 w-full rounded-xl border border-white/10 bg-yellow-500/50 px-16 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Save App / Save Version modal */}
        {isSaveAppOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">
                {currentAppId ? "Save new version" : "Name your app"}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {currentAppId
                  ? `This will save a new version of ${currentAppName ?? "this app"}.`
                  : `This app will be saved under ${selectedOrganization?.name}.`}
              </p>

              {!currentAppId && (
                <input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
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
                  onClick={() => {
                    setAppName("");
                    setSaveAppError(null);
                    setIsSaveAppOpen(false);
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveApp}
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
        )}

        {/* Select App modal */}
        {isSelectAppOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-20 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">Select App</h2>

              <p className="mt-2 text-sm text-slate-500">
                Apps under {selectedOrganization?.name}
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
                      onClick={() => handleSelectApp(app)}
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
                onClick={() => setIsSelectAppOpen(false)}
                className="mt-20 h-28 w-full rounded-xl border border-white/10 bg-yellow-500/50 px-16 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Version History modal */}
        {isVersionHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-26 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">
                Version History
              </h2>

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
                          <p className="pb-10 text-sm font-bold text-white">
                            v{version.versionNumber}{" "}
                            {index === 0 && (
                              <span className="text-xs font-semibold text-cyan-300">
                                Latest
                              </span>
                            )}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {version.prompt}
                          </p>

                          <p className="mt-2 text-[11px] font-medium text-slate-600">
                            {new Date(version.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleLoadVersion(version.versionNumber)
                          }
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
                onClick={() => setIsVersionHistoryOpen(false)}
                className="mt-20 h-28 w-full rounded-xl border border-white/10 bg-yellow-500/50 px-16 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete App confirmation modal */}
        {isDeleteAppOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 m-80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-lg border border-red-400/20 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">Delete app?</h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                This will permanently delete{" "}
                <span className="font-semibold text-slate-200">
                  {currentAppName ?? "this app"}
                </span>{" "}
                and all saved versions. This cannot be undone.
              </p>

              {deleteAppError && (
                <p className="mt-3 text-sm font-medium text-red-300">
                  {deleteAppError}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteAppError(null);
                    setIsDeleteAppOpen(false);
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteApp}
                  disabled={isDeletingApp}
                  className="h-11 rounded-xl bg-red-400 px-4 text-sm font-bold text-white transition hover:bg-red-300 disabled:opacity-50"
                >
                  {isDeletingApp ? "Deleting..." : "Delete app"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="min-w-0 flex-1 overflow-hidden p-5">
          <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-3 flex shrink-0 items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Live Preview
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-200">
                  Generated application canvas
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                <span className="px-5 font-mono text-[11px] text-slate-400">
                  OutRival
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              {isLoadingSelectedApp ? (
                <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400">
                  Loading app preview...
                </div>
              ) : (
                <iframe
                  key={previewKey}
                  src={`http://localhost:5173?preview=${previewKey}`}
                  className="h-full w-full border-0"
                  title="Generated App Preview"
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </RequireRole>
  );
}
