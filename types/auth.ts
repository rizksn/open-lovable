export type AppRole = "platform_admin" | "editor";

export type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
  organizationId: string;
  institutionId?: string;
};
