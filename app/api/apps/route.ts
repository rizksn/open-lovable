/**
 * App collection route.
 *
 * POST /api/apps
 * Creates a brand-new app for an organization and saves its first version.
 *
 * Flow:
 * 1. Validate request payload.
 * 2. Authenticate the current Supabase user.
 * 3. Verify the user can create apps for the requested organization.
 * 4. Create the app metadata row in `apps`.
 * 5. Upload the current `generated-app/` workspace source files to Supabase Storage.
 * 6. Create the initial `app_versions` row pointing to that saved source snapshot.
 *
 * Important design note:
 * `generated-app/` is only the temporary live builder workspace.
 * Supabase Storage is the durable source of truth for saved app versions.
 *
 * GET /api/apps?organizationId=...
 * Lists apps for the selected organization, ordered newest first.
 *
 * Future hardening:
 * tighten organization/role checks for institutional users and align with RLS policies.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  uploadGeneratedAppToSupabaseVersion,
  deleteSupabaseVersionStorage,
} from "@/lib/apps/storage";

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
  const supabaseServer = await createSupabaseServerClient();

  let createdAppId: string | null = null;
  let createdVersionId: string | null = null;
  let uploadedStoragePath: string | null = null;

  try {
    const body = (await request.json()) as CreateAppRequest;

    if (!body.organizationId || !body.name?.trim() || !body.prompt?.trim()) {
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

    const trimmedName = body.name.trim();
    const trimmedPrompt = body.prompt.trim();

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
    const isEditor = userProfile.role === "editor";
    const isOwnOrganization =
      userProfile.organization_id === body.organizationId;

    if (userProfile.role === "viewer") {
      return NextResponse.json(
        { success: false, error: "Viewers cannot save apps" },
        { status: 403 },
      );
    }

    if (!isPlatformAdmin && !(isEditor && isOwnOrganization)) {
      return NextResponse.json(
        {
          success: false,
          error: "Not allowed to save apps for this organization",
        },
        { status: 403 },
      );
    }

    const slug = createSlug(trimmedName);
    const insertTimestamp = new Date().toISOString();

    const { data: app, error: appError } = await supabaseServer
      .from("apps")
      .insert({
        organization_id: body.organizationId,
        created_by_user_id: user.id,
        name: trimmedName,
        slug,
        status: "draft",
        is_published: false,
        current_version_id: null,
        published_version_id: null,
        published_at: null,
        updated_at: insertTimestamp,
      })
      .select("id, slug")
      .single();

    if (appError || !app) {
      throw new Error(appError?.message ?? "Failed to create app");
    }

    createdAppId = app.id;

    console.log("[create-app-save] app created", {
      appId: app.id,
      slug: app.slug,
      organizationId: body.organizationId,
      userId: user.id,
      role: userProfile.role,
    });

    uploadedStoragePath = await uploadGeneratedAppToSupabaseVersion({
      supabase: supabaseServer,
      organizationId: body.organizationId,
      appSlug: app.slug,
      versionNumber: 1,
    });

    const { data: version, error: versionError } = await supabaseServer
      .from("app_versions")
      .insert({
        app_id: app.id,
        version_number: 1,
        prompt: trimmedPrompt,
        files: body.files,
        storage_path: uploadedStoragePath,
        created_by_user_id: user.id,
      })
      .select("id, version_number")
      .single();

    if (versionError || !version) {
      throw new Error(versionError?.message ?? "Failed to create app version");
    }

    createdVersionId = version.id;

    console.log("[create-app-save] version created", {
      versionId: version.id,
      appId: app.id,
      versionNumber: version.version_number,
      storagePath: uploadedStoragePath,
    });

    const updateTimestamp = new Date().toISOString();

    const { error: updateAppError } = await supabaseServer
      .from("apps")
      .update({
        current_version_id: version.id,
        updated_at: updateTimestamp,
      })
      .eq("id", app.id);

    if (updateAppError) {
      throw new Error(
        updateAppError.message ?? "Failed to update app current version",
      );
    }

    const { data: verifiedApp, error: verifyAppError } = await supabaseServer
      .from("apps")
      .select("id, current_version_id, updated_at")
      .eq("id", app.id)
      .single();

    if (verifyAppError || !verifiedApp) {
      throw new Error(
        verifyAppError?.message ?? "Failed to verify updated app row",
      );
    }

    console.log("[create-app-save] verified app update", {
      appId: verifiedApp.id,
      expectedCurrentVersionId: version.id,
      actualCurrentVersionId: verifiedApp.current_version_id,
      updatedAt: verifiedApp.updated_at,
    });

    if (verifiedApp.current_version_id !== version.id) {
      throw new Error("App current_version_id was not updated correctly");
    }

    return NextResponse.json({
      success: true,
      appId: app.id,
      slug: app.slug,
      currentVersionId: version.id,
      verifiedCurrentVersionId: verifiedApp.current_version_id,
      currentVersionNumber: version.version_number,
    });
  } catch (error) {
    if (uploadedStoragePath) {
      try {
        await deleteSupabaseVersionStorage({
          supabase: supabaseServer,
          storagePath: uploadedStoragePath,
        });
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded version storage", {
          uploadedStoragePath,
          cleanupError,
        });
      }
    }

    if (createdVersionId) {
      try {
        await supabaseServer
          .from("app_versions")
          .delete()
          .eq("id", createdVersionId);
      } catch (cleanupError) {
        console.error("Failed to clean up app version row", {
          createdVersionId,
          cleanupError,
        });
      }
    }

    if (createdAppId) {
      try {
        await supabaseServer.from("apps").delete().eq("id", createdAppId);
      } catch (cleanupError) {
        console.error("Failed to clean up app row", {
          createdAppId,
          cleanupError,
        });
      }
    }

    console.error("[create-app-save] failed:", error);

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
    const isOwnOrganization = userProfile.organization_id === organizationId;

    if (!isPlatformAdmin && !isOwnOrganization) {
      return NextResponse.json(
        {
          success: false,
          error: "Not allowed to view apps for this organization",
        },
        { status: 403 },
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
