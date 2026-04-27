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

export default function AdminHomePage() {
  const { user } = useAuth();
  const router = useRouter();

  /* Builder state */
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedApp, setHasGeneratedApp] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastFilesWritten, setLastFilesWritten] = useState<string[]>([]);
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
   * Saves the currently generated app as a new app under the selected organization.
   * The backend creates the app row, creates version v1,
   * and snapshots generated-app into storage/apps/{org}/{app}/versions/v1.
   */
  async function handleSaveApp() {
    if (!user) return;

    if (!selectedOrganization) {
      alert("Please select an organization before saving an app.");
      return;
    }

    if (!appName.trim()) {
      setSaveAppError("App name is required.");
      return;
    }

    const latestPrompt = history[0]?.prompt ?? prompt;

    const payload = {
      organizationId: selectedOrganization.id,
      name: appName.trim(),
      prompt: latestPrompt,
      files: lastFilesWritten,
    };

    setIsSavingApp(true);
    setSaveAppError(null);

    try {
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

      router.push(`/apps/${data.slug}`);
    } finally {
      setIsSavingApp(false);
    }
  }

  async function handleSelectApp(app: AppSummary) {
    setIsLoadingSelectedApp(true);
    setSelectAppError(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/apps/${app.id}/latest-version`);
      const data = await res.json();

      if (!data.success) {
        setSelectAppError(data.error ?? "Failed to load app.");
        return;
      }

      setCurrentAppId(data.app.id);
      setCurrentAppSlug(data.app.slug);
      setCurrentAppName(data.app.name);

      setLastFilesWritten(
        data.files.map((file: { path: string }) => file.path),
      );
      setHasGeneratedApp(true);
      setHistory([]);
      setPrompt("");
      setStatus("success");
      setIsSelectAppOpen(false);
    } catch (error) {
      console.error("[handleSelectApp] failed:", error);
      setSelectAppError("Something went wrong while loading the app.");
    } finally {
      setIsLoadingSelectedApp(false);
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
   * Temporary dev sanity check for Supabase client availability.
   * Remove this once I no longer need the console confirmation.
   */
  useEffect(() => {
    console.log("Supabase connected:", supabase);
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-lg shadow-black/20">
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
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
                <div className="mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
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
                <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
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

                <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
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

                  <p className="truncate text-sm font-semibold text-white">
                    {currentAppName ?? "New app"}
                  </p>
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

                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentAppId) {
                          setSaveAppError(null);
                          setIsSaveAppOpen(true);
                          return;
                        }

                        console.log("Save existing app:", currentAppId);
                      }}
                      className="mt-3 h-10 w-full rounded-xl bg-cyan-300 px-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-300/10 transition hover:bg-cyan-200"
                    >
                      Save app
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

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

        {isSelectOrgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">
                Select Organization
              </h2>

              <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto pr-1">
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
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
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
                className="mt-6 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isSaveAppOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold tracking-tight">
                Name your app
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                This app will be saved under {selectedOrganization?.name}.
              </p>

              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="App name"
                className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
              />

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
                  disabled={isSavingApp || !appName.trim()}
                  className="h-11 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
                >
                  {isSavingApp ? "Saving..." : "Save app"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSelectAppOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/60">
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
                className="mt-6 h-11 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
              >
                Cancel
              </button>
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
              <iframe
                src="http://localhost:5173"
                className="h-full w-full border-0"
                title="Generated App Preview"
              />
            </div>
          </div>
        </section>
      </main>
    </RequireRole>
  );
}
