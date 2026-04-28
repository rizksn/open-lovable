/**
 * Public published-app route.
 *
 * This page handles URLs like:
 *   /apps/[slug]
 *
 * Its job is to load a generated app by its public slug and render the
 * published version for end users.
 *
 * Important:
 * - This is NOT the admin/builder preview.
 * - The admin preview uses the local generated-app Vite iframe.
 * - This route should only expose apps that have been explicitly published.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/navigation/DashboardHeader";

type PublicAppPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicAppPage({ params }: PublicAppPageProps) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: app, error } = await supabase
    .from("apps")
    .select(
      "id, organization_id, name, slug, status, is_published, published_version_id, published_at",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error) {
    console.error("[apps.slug] Failed to load app:", error);
  }

  if (!app) {
    return (
      <main className="min-h-screen bg-[#050505] p-8 text-white">
        <h1 className="text-2xl font-semibold">App not found</h1>
        <p className="mt-2 text-white/50">
          No published app exists for slug: {slug}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] p-8 text-white">
      <DashboardHeader eyebrow="Public App" title={app.name} />

      {/* <h1 className="mt-3 text-3xl font-semibold tracking-tight">{app.name}</h1> */}

      {/* <p className="mt-2 text-white/50">Slug: {app.slug}</p> */}

      {/* {app.published_at && (
        <p className="mt-1 text-sm text-white/40">
          Published: {new Date(app.published_at).toLocaleString()}
        </p>
      )} */}

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        <iframe
          src={`/published/${app.slug}/`}
          className="h-[720px] w-full border-0"
          title={app.name}
        />
      </div>
    </main>
  );
}
