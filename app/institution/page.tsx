"use client";

import Link from "next/link";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/context/AuthContext";
import { mockApps } from "@/data/mockApps";
import { mockInstitutions } from "@/data/mockInstitutions";
import { mockMemberships } from "@/data/mockMemberships";
import { DashboardHeader } from "@/components/navigation/DashboardHeader";

export default function InstitutionPage() {
  const { user } = useAuth();

  const membership = user
    ? mockMemberships.find((m) => m.userId === user.id)
    : null;

  const institution = membership
    ? mockInstitutions.find((i) => i.id === membership.institutionId)
    : null;

  const institutionApps = institution
    ? mockApps.filter((app) => app.institutionId === institution.id)
    : [];

  return (
    <RequireRole allowedRoles={["editor"]}>
      <DashboardHeader
        eyebrow="Institution"
        title={institution?.name ?? "Client Dashboard"}
      />
      <main className="min-h-screen bg-[#050505] p-8 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
          Institution
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {institution?.name ?? "Client Dashboard"}
        </h1>

        <p className="mt-2 text-sm text-white/45">
          Role: {membership?.role ?? "unknown"}
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-medium">Your Apps</h2>

          <div className="mt-5 space-y-3">
            {institutionApps.map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.slug}`}
                className="block rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{app.name}</h3>
                    <p className="mt-1 text-xs text-white/45">
                      /apps/{app.slug}
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                    {app.visibility}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </RequireRole>
  );
}
