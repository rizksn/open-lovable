"use client";

import { useEffect, useState } from "react";

import { RequireRole } from "@/components/auth/RequireRole";
import { AppActivityPanel } from "@/components/apps/AppActivityPanel";
import { AppPreviewPanel } from "@/components/apps/AppPreviewPanel";
import { AppPromptComposer } from "@/components/apps/AppPromptComposer";
import { AppWorkspacePanel } from "@/components/apps/AppWorkspacePanel";
import { DeleteAppModal } from "@/components/apps/DeleteAppModal";
import { SaveAppModal } from "@/components/apps/SaveAppModal";
import { SelectAppModal } from "@/components/apps/SelectAppModal";
import {
  SelectTemplateModal,
  type TemplateSummary,
} from "@/components/apps/SelectTemplateModal";
import { VersionHistoryModal } from "@/components/apps/VersionHistoryModal";
import { OutRivalHeader } from "@/components/layout/OutRivalHeader";

import { useAuth } from "@/context/AuthContext";
import { useAppBuilder } from "@/hooks/useAppBuilder";

import { getOrganizationById } from "@/lib/organizations/client";
import { getTemplates, loadTemplate } from "@/lib/templates/client";

import type { AppWorkspacePermissions } from "@/types/app";
import type { Organization } from "@/types/organizations";

export default function InstitutionPage() {
  const { user } = useAuth();

  /* Organization state */
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(true);
  const [organizationError, setOrganizationError] = useState<string | null>(
    null,
  );

  /* Template state */
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<
    string | null
  >(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(
    null,
  );

  /* Select template modal state */
  const [isSelectTemplateOpen, setIsSelectTemplateOpen] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingSelectedTemplate, setIsLoadingSelectedTemplate] =
    useState(false);
  const [selectTemplateError, setSelectTemplateError] = useState<string | null>(
    null,
  );

  const builder = useAppBuilder({
    user,
    selectedOrganization,
  });

  const mode = builder.hasGeneratedApp ? "edit" : "create";

  const PUBLIC_APP_BASE_URL =
    process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

  const isViewer = user?.role === "viewer";
  const canPersist = user?.role === "editor" || user?.role === "platform_admin";

  const workspacePermissions: AppWorkspacePermissions = {
    canCreateOrganization: false,
    canSwitchOrganization: false,
    canPublishApp: canPersist,
    canDeleteApp: canPersist,
  };

  async function fetchTemplates() {
    setIsLoadingTemplates(true);
    setSelectTemplateError(null);

    try {
      const data = await getTemplates();

      if (!data.success) {
        setSelectTemplateError(data.error ?? "Failed to load templates.");
        return;
      }

      setTemplates(data.templates ?? []);
      setIsSelectTemplateOpen(true);
    } catch (error) {
      setSelectTemplateError(
        error instanceof Error ? error.message : "Failed to load templates.",
      );
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  async function handleSelectTemplate(template: TemplateSummary) {
    setIsLoadingSelectedTemplate(true);
    setSelectTemplateError(null);

    try {
      const { ok, data } = await loadTemplate(template.id);

      if (!ok || !data.success) {
        setSelectTemplateError(data.error ?? "Failed to load template.");
        builder.setStatus("error");
        return;
      }

      builder.setHistory([]);
      builder.setPrompt("");
      builder.setErrorMessage(null);
      builder.setLastFilesWritten(
        Array.isArray(data.files)
          ? data.files.map((file: { path: string }) => file.path)
          : [],
      );

      builder.setCurrentAppId(null);
      builder.setCurrentAppSlug(null);
      builder.setCurrentAppName(null);
      builder.setHasGeneratedApp(true);
      builder.setStatus("success");
      builder.setPreviewKey((key) => key + 1);

      setSelectedTemplateName(template.name);
      setCurrentTemplateId(template.id);
      setIsSelectTemplateOpen(false);
    } catch (error) {
      setSelectTemplateError(
        error instanceof Error ? error.message : "Failed to load template.",
      );
      builder.setStatus("error");
    } finally {
      setIsLoadingSelectedTemplate(false);
    }
  }

  useEffect(() => {
    async function loadOrganization() {
      if (!user?.organizationId) {
        setSelectedOrganization(null);
        setIsLoadingOrganization(false);
        setOrganizationError("No organization assigned to this user.");
        return;
      }

      setIsLoadingOrganization(true);
      setOrganizationError(null);

      try {
        const data = await getOrganizationById(user.organizationId);

        if (!data.success) {
          setSelectedOrganization(null);
          setOrganizationError(data.error ?? "Failed to load organization.");
          return;
        }

        setSelectedOrganization(data.organization);
      } catch (error) {
        console.error("[institution] failed to load organization", error);
        setSelectedOrganization(null);
        setOrganizationError("Failed to load organization.");
      } finally {
        setIsLoadingOrganization(false);
      }
    }

    loadOrganization();
  }, [user?.organizationId]);

  const clearBuilderState = builder.clearBuilderState;

  useEffect(() => {
    async function resetOnLogout() {
      if (!user) {
        clearBuilderState();
        setCurrentTemplateId(null);
        setSelectedTemplateName(null);
      }
    }

    resetOnLogout();
  }, [user, clearBuilderState]);

  return (
    <RequireRole allowedRoles={["editor", "viewer"]}>
      <main className="flex h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_34%),linear-gradient(135deg,_#020617_0%,_#050816_45%,_#020617_100%)] text-slate-100">
        <aside className="flex h-screen w-[430px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950/85 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <OutRivalHeader />

          <AppWorkspacePanel
            mode={mode}
            userRole={user?.role}
            selectedOrganizationName={selectedOrganization?.name}
            selectedTemplateName={selectedTemplateName}
            hasSelectedOrganization={Boolean(selectedOrganization)}
            currentAppId={builder.currentAppId}
            currentAppName={builder.currentAppName}
            currentAppSlug={builder.currentAppSlug}
            hasGeneratedApp={builder.hasGeneratedApp}
            isLoadingApps={builder.isLoadingApps || isLoadingOrganization}
            isLoadingTemplates={isLoadingTemplates}
            status={builder.status}
            publicAppBaseUrl={PUBLIC_APP_BASE_URL}
            permissions={workspacePermissions}
            onCreateOrganization={() => {}}
            onSwitchOrganization={() => {}}
            onSelectApp={builder.fetchAppsForSelectedOrganization}
            onSelectTemplate={fetchTemplates}
            onOpenVersionHistory={builder.handleOpenVersionHistory}
            onPublishApp={builder.handlePublishApp}
            onOpenDeleteApp={() => {
              builder.setDeleteAppError(null);
              builder.setIsDeleteAppOpen(true);
            }}
          />

          <AppActivityPanel
            status={builder.status}
            history={builder.history}
            lastFilesWritten={builder.lastFilesWritten}
            mode={mode}
            onUsePrompt={builder.setPrompt}
          />

          <AppPromptComposer
            isAuthenticated={Boolean(user)}
            canSave={canPersist}
            canSaveTemplate={false}
            currentAppId={builder.currentAppId}
            mode={mode}
            prompt={builder.prompt}
            hasGeneratedApp={builder.hasGeneratedApp}
            errorMessage={organizationError ?? builder.errorMessage}
            isGenerating={builder.isGenerating}
            onOpenSaveModal={
              canPersist
                ? () => {
                    builder.setSaveAppError(null);
                    builder.setIsSaveAppOpen(true);
                  }
                : undefined
            }
            onPromptChange={builder.setPrompt}
            onGenerate={builder.handleGenerate}
            onReset={async () => {
              await builder.handleReset();
              setSelectedTemplateName(null);
              setCurrentTemplateId(null);
            }}
          />
        </aside>

        <SaveAppModal
          isOpen={builder.isSaveAppOpen}
          currentAppId={builder.currentAppId}
          currentAppName={builder.currentAppName}
          selectedOrganizationName={selectedOrganization?.name}
          appName={builder.appName}
          saveAppError={builder.saveAppError}
          isSavingApp={builder.isSavingApp}
          onAppNameChange={builder.setAppName}
          onClose={() => {
            builder.setAppName("");
            builder.setSaveAppError(null);
            builder.setIsSaveAppOpen(false);
          }}
          onSave={builder.handleSaveApp}
        />

        <SelectAppModal
          isOpen={builder.isSelectAppOpen}
          organizationName={selectedOrganization?.name}
          apps={builder.apps}
          selectAppError={builder.selectAppError}
          isLoadingSelectedApp={builder.isLoadingSelectedApp}
          onSelectApp={async (app) => {
            setCurrentTemplateId(null);
            await builder.handleSelectApp(app);
            setSelectedTemplateName(null);
          }}
          onClose={() => builder.setIsSelectAppOpen(false)}
        />

        <SelectTemplateModal
          isOpen={isSelectTemplateOpen}
          templates={templates}
          selectTemplateError={selectTemplateError}
          isLoadingSelectedTemplate={
            isLoadingSelectedTemplate || isLoadingTemplates
          }
          onSelectTemplate={handleSelectTemplate}
          onClose={() => {
            setSelectTemplateError(null);
            setIsSelectTemplateOpen(false);
          }}
        />

        <VersionHistoryModal
          isOpen={builder.isVersionHistoryOpen}
          currentAppName={builder.currentAppName}
          versionHistoryError={builder.versionHistoryError}
          isLoadingVersions={builder.isLoadingVersions}
          versions={builder.versions}
          isLoadingSelectedVersion={builder.isLoadingSelectedVersion}
          onLoadVersion={builder.handleLoadVersion}
          onClose={() => builder.setIsVersionHistoryOpen(false)}
        />

        <DeleteAppModal
          isOpen={builder.isDeleteAppOpen}
          currentAppName={builder.currentAppName}
          deleteAppError={builder.deleteAppError}
          isDeletingApp={builder.isDeletingApp}
          onDelete={builder.handleDeleteApp}
          onClose={() => {
            builder.setDeleteAppError(null);
            builder.setIsDeleteAppOpen(false);
          }}
        />

        <AppPreviewPanel
          isLoadingSelectedApp={
            isLoadingOrganization || builder.isLoadingSelectedApp
          }
          previewKey={builder.previewKey}
        />
      </main>
    </RequireRole>
  );
}
