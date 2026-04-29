"use client";

import { useEffect, useState } from "react";

import { RequireRole } from "@/components/auth/RequireRole";
import { CreateOrganizationModal } from "@/components/admin/CreateOrganizationModal";
import { SelectOrganizationModal } from "@/components/admin/SelectOrganizationModal";
import { AppActivityPanel } from "@/components/apps/AppActivityPanel";
import { AppPreviewPanel } from "@/components/apps/AppPreviewPanel";
import { AppPromptComposer } from "@/components/apps/AppPromptComposer";
import { AppWorkspacePanel } from "@/components/apps/AppWorkspacePanel";
import { DeleteAppModal } from "@/components/apps/DeleteAppModal";
import { SaveAppModal } from "@/components/apps/SaveAppModal";
import { SelectAppModal } from "@/components/apps/SelectAppModal";
import { VersionHistoryModal } from "@/components/apps/VersionHistoryModal";
import { OutRivalHeader } from "@/components/layout/OutRivalHeader";

import { useAuth } from "@/context/AuthContext";
import { useAppBuilder } from "@/hooks/useAppBuilder";

import { resetGeneratedApp } from "@/lib/apps/client";
import {
  createOrganization,
  getOrganizations,
} from "@/lib/organizations/client";

import type { AppWorkspacePermissions } from "@/types/app";
import type { Organization } from "@/types/organizations";

export default function AdminHomePage() {
  const { user } = useAuth();

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

  const builder = useAppBuilder({
    user,
    selectedOrganization,
  });

  const mode = builder.hasGeneratedApp ? "edit" : "create";

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
        builder.setCurrentAppId(null);
        builder.setCurrentAppSlug(null);
        builder.setCurrentAppName(null);
        builder.setApps([]);
      }

      await fetchOrganizations();
    } catch (err) {
      setOrganizationError("Something went wrong");
    } finally {
      setIsCreatingOrganization(false);
    }
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
  const { clearBuilderState } = builder;

  useEffect(() => {
    async function resetOnLogout() {
      if (!user) {
        await resetGeneratedApp();
        clearBuilderState();
      }
    }

    resetOnLogout();
  }, [user, clearBuilderState]);

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
            currentAppId={builder.currentAppId}
            currentAppName={builder.currentAppName}
            currentAppSlug={builder.currentAppSlug}
            hasGeneratedApp={builder.hasGeneratedApp}
            isLoadingApps={builder.isLoadingApps}
            status={builder.status}
            publicAppBaseUrl={PUBLIC_APP_BASE_URL}
            permissions={workspacePermissions}
            onCreateOrganization={() => setIsCreateOrgOpen(true)}
            onSwitchOrganization={async () => {
              await fetchOrganizations();
              setIsSelectOrgOpen(true);
            }}
            onSelectApp={builder.fetchAppsForSelectedOrganization}
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
            canSave={true}
            currentAppId={builder.currentAppId}
            mode={mode}
            prompt={builder.prompt}
            hasGeneratedApp={builder.hasGeneratedApp}
            errorMessage={builder.errorMessage}
            isGenerating={builder.isGenerating}
            onOpenSaveModal={() => {
              builder.setSaveAppError(null);
              builder.setIsSaveAppOpen(true);
            }}
            onPromptChange={builder.setPrompt}
            onGenerate={builder.handleGenerate}
            onReset={builder.handleReset}
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
            builder.setCurrentAppId(null);
            builder.setCurrentAppSlug(null);
            builder.setCurrentAppName(null);
            builder.setApps([]);
            setIsSelectOrgOpen(false);
          }}
          onClose={() => setIsSelectOrgOpen(false)}
        />

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
          onSelectApp={builder.handleSelectApp}
          onClose={() => builder.setIsSelectAppOpen(false)}
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
          isLoadingSelectedApp={builder.isLoadingSelectedApp}
          previewKey={builder.previewKey}
        />
      </main>
    </RequireRole>
  );
}
