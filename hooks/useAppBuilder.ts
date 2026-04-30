"use client";

import { useEffect, useState, useCallback } from "react";

import type { Dispatch, SetStateAction } from "react";
import type { AuthUser } from "@/types/auth";
import type { Organization } from "@/types/organizations";
import type {
  AppBuilderStatus,
  AppSummary,
  AppVersionSummary,
  HistoryItem,
} from "@/types/app";

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

type UseAppBuilderArgs = {
  user: AuthUser | null;
  selectedOrganization: Organization | null;
};

type UseAppBuilderReturn = {
  /* Builder state */
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  isGenerating: boolean;
  hasGeneratedApp: boolean;
  previewKey: number;
  history: HistoryItem[];
  lastFilesWritten: string[];
  latestPrompt: string;
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  status: AppBuilderStatus;

  /* App state */
  apps: AppSummary[];
  setApps: Dispatch<SetStateAction<AppSummary[]>>;
  currentAppId: string | null;
  setCurrentAppId: Dispatch<SetStateAction<string | null>>;
  currentAppSlug: string | null;
  setCurrentAppSlug: Dispatch<SetStateAction<string | null>>;
  currentAppName: string | null;
  setCurrentAppName: Dispatch<SetStateAction<string | null>>;

  /* Save app modal state */
  isSaveAppOpen: boolean;
  setIsSaveAppOpen: Dispatch<SetStateAction<boolean>>;
  appName: string;
  setAppName: Dispatch<SetStateAction<string>>;
  isSavingApp: boolean;
  saveAppError: string | null;
  setSaveAppError: Dispatch<SetStateAction<string | null>>;

  /* Select app modal state */
  isSelectAppOpen: boolean;
  setIsSelectAppOpen: Dispatch<SetStateAction<boolean>>;
  isLoadingApps: boolean;
  isLoadingSelectedApp: boolean;
  selectAppError: string | null;

  /* Version history modal state */
  isVersionHistoryOpen: boolean;
  setIsVersionHistoryOpen: Dispatch<SetStateAction<boolean>>;
  versions: AppVersionSummary[];
  isLoadingVersions: boolean;
  isLoadingSelectedVersion: boolean;
  versionHistoryError: string | null;

  /* Delete app modal state */
  isDeleteAppOpen: boolean;
  setIsDeleteAppOpen: Dispatch<SetStateAction<boolean>>;
  isDeletingApp: boolean;
  deleteAppError: string | null;
  setDeleteAppError: Dispatch<SetStateAction<string | null>>;

  /* Shared handlers */
  handleGenerate: () => Promise<void>;
  handleSaveApp: () => Promise<void>;
  handleSelectApp: (app: AppSummary) => Promise<void>;
  handleOpenVersionHistory: () => Promise<void>;
  handleLoadVersion: (versionNumber: number) => Promise<void>;
  handlePublishApp: () => Promise<void>;
  handleDeleteApp: () => Promise<void>;
  fetchAppsForSelectedOrganization: () => Promise<void>;
  clearBuilderState: () => void;
  handleReset: () => Promise<void>;
};

export function useAppBuilder({
  user,
  selectedOrganization,
}: UseAppBuilderArgs): UseAppBuilderReturn {
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
        setSaveAppError(null);
        setStatus("success");
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

      const trimmedAppName = appName.trim();

      const data = await saveApp({
        organizationId: selectedOrganization.id,
        name: trimmedAppName,
        prompt: promptToSave,
        files: lastFilesWritten,
      });

      if (!data.success) {
        setSaveAppError(data.error ?? "Failed to save app.");
        return;
      }

      setCurrentAppId(data.appId);
      setCurrentAppSlug(data.slug);
      setCurrentAppName(trimmedAppName);

      setIsSaveAppOpen(false);
      setAppName("");
      setSaveAppError(null);
      setStatus("success");
    } catch (error) {
      setSaveAppError(
        error instanceof Error ? error.message : "Failed to save app.",
      );
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
    setErrorMessage(null);
    setStatus("validating");

    try {
      const data = await getAppVersion(currentAppId, versionNumber);

      if (!data.success) {
        setVersionHistoryError(data.error ?? "Failed to load version.");
        setStatus("error");
        return;
      }

      setLatestPrompt(data.version?.prompt ?? "");
      setPreviewKey((key) => key + 1);
      setIsVersionHistoryOpen(false);
      setStatus("success");
    } catch (error) {
      console.error("[handleLoadVersion] failed:", error);
      setVersionHistoryError("Something went wrong while loading the version.");
      setStatus("error");
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
    } catch (error) {
      setDeleteAppError(
        error instanceof Error ? error.message : "Failed to delete app.",
      );
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

  const clearBuilderState = useCallback(() => {
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
  }, []);

  /**
   * Manually resets the temporary generated-app workspace
   * and clears the current builder/admin state.
   */
  async function handleReset() {
    await resetGeneratedApp();
    clearBuilderState();
    setPreviewKey((key) => key + 1);
  }

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

  return {
    /* Builder state */
    prompt,
    setPrompt,
    isGenerating,
    hasGeneratedApp,
    previewKey,
    history,
    lastFilesWritten,
    latestPrompt,
    errorMessage,
    setErrorMessage,
    status,

    /* App state */
    apps,
    setApps,
    currentAppId,
    setCurrentAppId,
    currentAppSlug,
    setCurrentAppSlug,
    currentAppName,
    setCurrentAppName,

    /* Save app modal state */
    isSaveAppOpen,
    setIsSaveAppOpen,
    appName,
    setAppName,
    isSavingApp,
    saveAppError,
    setSaveAppError,

    /* Select app modal state */
    isSelectAppOpen,
    setIsSelectAppOpen,
    isLoadingApps,
    isLoadingSelectedApp,
    selectAppError,

    /* Version history modal state */
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    versions,
    isLoadingVersions,
    isLoadingSelectedVersion,
    versionHistoryError,

    /* Delete app modal state */
    isDeleteAppOpen,
    setIsDeleteAppOpen,
    isDeletingApp,
    deleteAppError,
    setDeleteAppError,

    /* Shared handlers */
    handleGenerate,
    handleSaveApp,
    handleSelectApp,
    handleOpenVersionHistory,
    handleLoadVersion,
    handlePublishApp,
    handleDeleteApp,
    fetchAppsForSelectedOrganization,
    clearBuilderState,
    handleReset,
  };
}
