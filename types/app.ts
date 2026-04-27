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
