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
    .select("id, name, slug, status")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("[apps.slug] Failed to load app:", error);
  }

  if (!app) {
    return (
      <main className="min-h-screen bg-[#050505] p-8 text-white">
        <h1 className="text-2xl font-semibold">App not found</h1>
        <p className="mt-2 text-white/50">No app exists for slug: {slug}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] p-8 text-white">
      <DashboardHeader eyebrow="Public App" title={app.name} />

      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{app.name}</h1>

      <p className="mt-2 text-white/50">Slug: {app.slug}</p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm text-white/50">
          This will render the generated app UI.
        </p>
      </div>
    </main>
  );
}
