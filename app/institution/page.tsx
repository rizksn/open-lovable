"use client";

import { RequireRole } from "@/components/auth/RequireRole";
import { DashboardHeader } from "@/components/navigation/DashboardHeader";

export default function InstitutionPage() {
  return (
    <RequireRole allowedRoles={["editor"]}>
      <main className="min-h-screen bg-[#050505] p-8 text-white">
        <DashboardHeader eyebrow="Institution" title="Institution Dashboard" />

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-medium">Institution workspace</h2>
          <p className="mt-2 text-sm text-white/45">
            This dashboard will list the institution&apos;s published and saved
            apps.
          </p>
        </div>
      </main>
    </RequireRole>
  );
}
