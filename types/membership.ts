export type InstitutionMembership = {
  id: string;
  userId: string;
  institutionId: string;
  role: "owner" | "admin" | "member";
};
