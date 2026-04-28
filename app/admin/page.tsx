"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { RequireRole } from "@/components/auth/RequireRole";

import { SaveAppModal } from "@/components/apps/SaveAppModal";
import { SelectAppModal } from "@/components/apps/SelectAppModal";
import { VersionHistoryModal } from "@/components/apps/VersionHistoryModal";
import { DeleteAppModal } from "@/components/apps/DeleteAppModal";
import { SelectOrganizationModal } from "@/components/admin/SelectOrganizationModal";
import { CreateOrganizationModal } from "@/components/admin/CreateOrganizationModal";
import { OutRivalHeader } from "@/components/layout/OutRivalHeader";
import { AppWorkspacePanel } from "@/components/apps/AppWorkspacePanel";
import { AppActivityPanel } from "@/components/apps/AppActivityPanel";
import { AppPromptComposer } from "@/components/apps/AppPromptComposer";
import { AppPreviewPanel } from "@/components/apps/AppPreviewPanel";

import type {
  AppBuilderStatus,
  AppSummary,
  AppVersionSummary,
  AppWorkspacePermissions,
  HistoryItem,
} from "@/types/app";

import type { Organization } from "@/types/organizations";

import {
  deleteApp,
  generateApp,
  getAppsByOrganization,
  getAppVersion,
  getAppVersions,
  getLatestAppVersion,
  publishApp,
  resetGeneratedApp,
  saveApp,
  saveAppVersion,
  restartVitePreview,
} from "@/lib/apps/client";

import {
  createOrganization,
  getOrganizations,
} from "@/lib/organizations/client";

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
  const [status, setStatus] = useState<AppBuilderStatus>("idle");

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

  const PUBLIC_APP_BASE_URL =
    process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

  /**
   * Loads all organizations the current admin can choose from.
   * Used to populate the organization selector.
   */
  async function fetchOrganizations() {
    setIsLoadingOrganizations(true);

    try {
      const data = await getOrganizations();

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
      const data = await createOrganization({
        name: organizationName.trim(),
        slug: organizationSlug.trim(),
      });

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
      const { ok, data } = await generateApp({
        prompt: submittedPrompt,
        isEdit: hasGeneratedApp,
      });

      setStatus("validating");

      if (!ok) {
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
        const data = await saveAppVersion(currentAppId, {
          prompt: promptToSave,
          files: lastFilesWritten,
        });

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

      const data = await saveApp({
        organizationId: selectedOrganization.id,
        name: appName.trim(),
        prompt: promptToSave,
        files: lastFilesWritten,
      });

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

  /**
   * Loads an existing app into the builder.
   *
   * This hydrates the temporary generated-app workspace from the app's latest
   * saved version, updates the current app state, restarts the Vite preview,
   * and refreshes the iframe so the selected app appears in the live preview.
   */
  async function handleSelectApp(app: AppSummary) {
    setIsLoadingSelectedApp(true);
    setSelectAppError(null);
    setErrorMessage(null);
    setStatus("validating");

    try {
      const { ok, data } = await getLatestAppVersion(app.id);

      if (!ok || !data.success) {
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

      const restartResult = await restartVitePreview();

      if (!restartResult.ok) {
        console.warn("[handleSelectApp] Vite restart failed after hydration");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPreviewKey((key) => key + 1);
      setStatus("success");
      setIsSelectAppOpen(false);
    } catch (error) {
      console.error("[handleSelectApp] failed:", error);
      setSelectAppError("Something went wrong while loading the app.");
      setStatus("error");
    } finally {
      setIsLoadingSelectedApp(false);
    }
  }

  /**
   * Opens the version history modal for the current app.
   *
   * This loads all saved versions for the selected app so the user can review
   * prior prompts and choose a version to hydrate back into the live preview.
   */
  async function handleOpenVersionHistory() {
    if (!currentAppId) return;

    setIsLoadingVersions(true);
    setVersionHistoryError(null);
    setIsVersionHistoryOpen(true);

    try {
      const data = await getAppVersions(currentAppId);

      if (!data.success) {
        setVersionHistoryError(data.error ?? "Failed to load versions.");
        return;
      }

      setVersions(data.versions ?? []);
    } finally {
      setIsLoadingVersions(false);
    }
  }

  /**
   * Loads a specific version of the current app into the builder.
   *
   * This hydrates the generated-app workspace from the selected version,
   * updates the prompt used for that version, refreshes the preview iframe,
   * and closes the version history modal.
   */
  async function handleLoadVersion(versionNumber: number) {
    if (!currentAppId) return;

    setIsLoadingSelectedVersion(true);
    setVersionHistoryError(null);

    try {
      const data = await getAppVersion(currentAppId, versionNumber);

      if (!data.success) {
        setVersionHistoryError(data.error ?? "Failed to load version.");
        return;
      }

      setLatestPrompt(data.version?.prompt ?? "");

      const restartResult = await restartVitePreview();

      if (!restartResult.ok) {
        console.warn(
          "[handleLoadVersion] Vite restart failed after version load",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPreviewKey((key) => key + 1);
      setIsVersionHistoryOpen(false);
      setStatus("success");
    } finally {
      setIsLoadingSelectedVersion(false);
    }
  }

  /**
   * Publishes the current app so it becomes accessible via its public URL.
   *
   * This triggers the backend to mark the app as published and make the latest
   * version available for external access.
   */
  async function handlePublishApp() {
    if (!currentAppId) return;

    setErrorMessage(null);
    setStatus("validating");

    try {
      const { ok, data } = await publishApp(currentAppId);

      if (!ok || !data.success) {
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

  /**
   * Deletes the current app and resets the live preview workspace.
   *
   * This removes the selected app and its saved versions, resets the temporary
   * generated-app preview back to the starter state, clears app-specific state,
   * and refreshes the app list for the selected organization.
   */
  async function handleDeleteApp() {
    if (!currentAppId) return;

    setIsDeletingApp(true);
    setDeleteAppError(null);
    setIsDeleteAppOpen(false);

    try {
      const data = await deleteApp(currentAppId);

      if (!data.success) {
        setDeleteAppError(data.error ?? "Failed to delete app.");
        return;
      }

      const resetData = await resetGeneratedApp();

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
      const data = await getAppsByOrganization(selectedOrganization.id);

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
   * Manually resets the temporary generated-app workspace
   * and clears the current builder/admin state.
   */
  async function handleReset() {
    await resetGeneratedApp();

    clearBuilderState();
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
        await resetGeneratedApp();
        clearBuilderState();
      }
    }

    resetOnLogout();
  }, [user]);

  const workspacePermissions: AppWorkspacePermissions = {
    canCreateOrganization: user?.role === "platform_admin",
    canSwitchOrganization: user?.role === "platform_admin",
    canPublishApp: true,
    canDeleteApp: true,
  };

  return (
    <RequireRole allowedRoles={["platform_admin"]}>
      <main className="flex h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_34%),linear-gradient(135deg,_#020617_0%,_#050816_45%,_#020617_100%)] text-slate-100">
        <aside className="flex h-screen w-[430px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950/85 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <OutRivalHeader />

          <AppWorkspacePanel
            mode={mode}
            userRole={user?.role}
            selectedOrganizationName={selectedOrganization?.name}
            hasSelectedOrganization={Boolean(selectedOrganization)}
            currentAppId={currentAppId}
            currentAppName={currentAppName}
            currentAppSlug={currentAppSlug}
            hasGeneratedApp={hasGeneratedApp}
            isLoadingApps={isLoadingApps}
            status={status}
            publicAppBaseUrl={PUBLIC_APP_BASE_URL}
            permissions={workspacePermissions}
            onCreateOrganization={() => setIsCreateOrgOpen(true)}
            onSwitchOrganization={async () => {
              await fetchOrganizations();
              setIsSelectOrgOpen(true);
            }}
            onSelectApp={fetchAppsForSelectedOrganization}
            onOpenVersionHistory={handleOpenVersionHistory}
            onPublishApp={handlePublishApp}
            onOpenDeleteApp={() => {
              setDeleteAppError(null);
              setIsDeleteAppOpen(true);
            }}
          />

          <AppActivityPanel
            status={status}
            history={history}
            lastFilesWritten={lastFilesWritten}
            mode={mode}
            onUsePrompt={setPrompt}
          />

          <AppPromptComposer
            isAuthenticated={Boolean(user)}
            currentAppId={currentAppId}
            mode={mode}
            prompt={prompt}
            hasGeneratedApp={hasGeneratedApp}
            errorMessage={errorMessage}
            isGenerating={isGenerating}
            onOpenSaveModal={() => {
              setSaveAppError(null);
              setIsSaveAppOpen(true);
            }}
            onPromptChange={setPrompt}
            onGenerate={handleGenerate}
            onReset={handleReset}
          />
        </aside>

        <CreateOrganizationModal
          isOpen={isCreateOrgOpen}
          organizationName={organizationName}
          organizationSlug={organizationSlug}
          organizationError={organizationError}
          isCreatingOrganization={isCreatingOrganization}
          onOrganizationNameChange={setOrganizationName}
          onOrganizationSlugChange={setOrganizationSlug}
          onCreateOrganization={handleCreateOrganization}
          onClose={() => {
            setOrganizationName("");
            setOrganizationSlug("");
            setOrganizationError(null);
            setIsCreateOrgOpen(false);
          }}
        />

        <SelectOrganizationModal
          isOpen={isSelectOrgOpen}
          organizations={organizations}
          isLoadingOrganizations={isLoadingOrganizations}
          onSelectOrganization={(organization) => {
            setSelectedOrganization(organization);
            setCurrentAppId(null);
            setCurrentAppSlug(null);
            setCurrentAppName(null);
            setApps([]);
            setIsSelectOrgOpen(false);
          }}
          onClose={() => setIsSelectOrgOpen(false)}
        />

        <SaveAppModal
          isOpen={isSaveAppOpen}
          currentAppId={currentAppId}
          currentAppName={currentAppName}
          selectedOrganizationName={selectedOrganization?.name}
          appName={appName}
          saveAppError={saveAppError}
          isSavingApp={isSavingApp}
          onAppNameChange={setAppName}
          onClose={() => {
            setAppName("");
            setSaveAppError(null);
            setIsSaveAppOpen(false);
          }}
          onSave={handleSaveApp}
        />

        <SelectAppModal
          isOpen={isSelectAppOpen}
          organizationName={selectedOrganization?.name}
          apps={apps}
          selectAppError={selectAppError}
          isLoadingSelectedApp={isLoadingSelectedApp}
          onSelectApp={handleSelectApp}
          onClose={() => setIsSelectAppOpen(false)}
        />

        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          currentAppName={currentAppName}
          versionHistoryError={versionHistoryError}
          isLoadingVersions={isLoadingVersions}
          versions={versions}
          isLoadingSelectedVersion={isLoadingSelectedVersion}
          onLoadVersion={handleLoadVersion}
          onClose={() => setIsVersionHistoryOpen(false)}
        />

        <DeleteAppModal
          isOpen={isDeleteAppOpen}
          currentAppName={currentAppName}
          deleteAppError={deleteAppError}
          isDeletingApp={isDeletingApp}
          onDelete={handleDeleteApp}
          onClose={() => {
            setDeleteAppError(null);
            setIsDeleteAppOpen(false);
          }}
        />

        <AppPreviewPanel
          isLoadingSelectedApp={isLoadingSelectedApp}
          previewKey={previewKey}
        />
      </main>
    </RequireRole>
  );
}
