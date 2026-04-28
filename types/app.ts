export type AppVisibility = "public" | "private";

export type GeneratedApp = {
  id: string;
  institutionId: string;
  name: string;
  slug: string;
  visibility: AppVisibility;
  createdByUserId: string;
  createdAt: string;
};

export type AppBuilderMode = "create" | "edit";

export type AppBuilderStatus =
  | "idle"
  | "generating"
  | "validating"
  | "success"
  | "error";

export type HistoryItem = {
  id: string;
  prompt: string;
  mode: AppBuilderMode;
  filesWritten: string[];
};

export type AppSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  organization_id: string;
  created_at: string;
};

export type AppVersionSummary = {
  id: string;
  versionNumber: number;
  prompt: string;
  storagePath: string;
  createdAt: string;
};

export type AppWorkspacePermissions = {
  canCreateOrganization: boolean;
  canSwitchOrganization: boolean;
  canPublishApp: boolean;
  canDeleteApp: boolean;
};
