import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { copyGeneratedAppToLocalVersion } from "@/lib/apps/storage";

type CreateAppRequest = {
  organizationId: string;
  name: string;
  prompt: string;
  files: unknown[];
};

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateAppRequest;

    if (!body.organizationId || !body.name || !body.prompt) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot save app without files" },
        { status: 400 },
      );
    }

    const supabaseServer = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: userProfile, error: userError } = await supabaseServer
      .from("users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "Invalid user" },
        { status: 401 },
      );
    }

    const isPlatformAdmin = userProfile.role === "platform_admin";
    const isOwnOrganization =
      userProfile.organization_id === body.organizationId;

    if (!isPlatformAdmin && !isOwnOrganization) {
      return NextResponse.json(
        {
          success: false,
          error: "Not allowed to save apps for this organization",
        },
        { status: 403 },
      );
    }

    const slug = createSlug(body.name);

    const { data: app, error: appError } = await supabaseServer
      .from("apps")
      .insert({
        organization_id: body.organizationId,
        created_by_user_id: user.id,
        name: body.name,
        slug,
        status: "draft",
      })
      .select("id, slug")
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { success: false, error: appError?.message ?? "Failed to create app" },
        { status: 500 },
      );
    }

    // ✅ snapshot current preview workspace into permanent app version folder
    const storagePath = await copyGeneratedAppToLocalVersion({
      organizationId: body.organizationId,
      appSlug: app.slug,
      versionNumber: 1,
    });

    const { error: versionError } = await supabaseServer
      .from("app_versions")
      .insert({
        app_id: app.id,
        version_number: 1,
        prompt: body.prompt,
        files: body.files,
        storage_path: storagePath,
        created_by_user_id: user.id,
      });

    if (versionError) {
      return NextResponse.json(
        { success: false, error: versionError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      appId: app.id,
      slug: app.slug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Missing organizationId" },
        { status: 400 },
      );
    }

    const supabaseServer = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: apps, error: appsError } = await supabaseServer
      .from("apps")
      .select("id, name, slug, status, organization_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (appsError) {
      return NextResponse.json(
        { success: false, error: appsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      apps: apps ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
