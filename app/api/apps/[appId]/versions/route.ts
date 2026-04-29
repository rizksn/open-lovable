/**
 * App versions collection route.
 *
 * POST /api/apps/[appId]/versions
 * Saves the current builder workspace as a new immutable version of an
 * existing app.
 *
 * Flow:
 * 1. Validate the request payload.
 * 2. Authenticate the current Supabase user.
 * 3. Load the user's profile and role.
 * 4. Load the target app metadata.
 * 5. Verify the user can save versions for this app.
 *    - platform_admin can save
 *    - editor can save within their own organization
 *    - viewer cannot save versions
 * 6. Find the latest version number for the app.
 * 7. Upload the current generated-app source files to Supabase Storage.
 * 8. Insert a new app_versions row pointing to that saved source snapshot.
 *
 * GET /api/apps/[appId]/versions
 * Lists all saved versions for an app, newest first.
 *
 * Access rules:
 * - platform_admin can view any app's versions
 * - editor can view versions for apps in their own organization
 * - viewer can view versions for apps in their own organization
 *
 * Important design note:
 * Versions are append-only source snapshots. Saving a new version does not
 * publish it or mutate older versions.
 *
 * Future hardening:
 * - add version labels or notes
 * - consider optimistic locking if multiple users edit the same app
 * - optionally track richer audit metadata for who saved each version and why
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadGeneratedAppToSupabaseVersion } from "@/lib/apps/storage";

type CreateAppVersionRequest = {
  prompt: string;
  files: unknown[];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;
    const body = (await request.json()) as CreateAppVersionRequest;

    if (!body.prompt) {
      return NextResponse.json(
        { success: false, error: "Missing prompt" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot save version without files" },
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

    const { data: app, error: appError } = await supabaseServer
      .from("apps")
      .select("id, slug, organization_id")
      .eq("id", appId)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { success: false, error: "App not found" },
        { status: 404 },
      );
    }

    const isPlatformAdmin = userProfile.role === "platform_admin";
    const isEditor = userProfile.role === "editor";
    const isOwnOrganization =
      userProfile.organization_id === app.organization_id;

    if (userProfile.role === "viewer") {
      return NextResponse.json(
        {
          success: false,
          error: "Viewers cannot save app versions",
        },
        { status: 403 },
      );
    }

    if (!isPlatformAdmin && !(isEditor && isOwnOrganization)) {
      return NextResponse.json(
        {
          success: false,
          error: "Not allowed to save versions for this app",
        },
        { status: 403 },
      );
    }

    const { data: latestVersion, error: latestVersionError } =
      await supabaseServer
        .from("app_versions")
        .select("version_number")
        .eq("app_id", app.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestVersionError) {
      return NextResponse.json(
        {
          success: false,
          error: latestVersionError.message,
        },
        { status: 500 },
      );
    }

    const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1;

    const storagePath = await uploadGeneratedAppToSupabaseVersion({
      supabase: supabaseServer,
      organizationId: app.organization_id,
      appSlug: app.slug,
      versionNumber: nextVersionNumber,
    });

    const { data: version, error: versionError } = await supabaseServer
      .from("app_versions")
      .insert({
        app_id: app.id,
        version_number: nextVersionNumber,
        prompt: body.prompt,
        files: body.files,
        storage_path: storagePath,
        created_by_user_id: user.id,
      })
      .select("id, version_number, storage_path, created_at")
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        {
          success: false,
          error: versionError?.message ?? "Failed to create app version",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      appId: app.id,
      version: {
        id: version.id,
        versionNumber: version.version_number,
        storagePath: version.storage_path,
        createdAt: version.created_at,
      },
    });
  } catch (error) {
    console.error("[create-app-version] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;

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

    const { data: app, error: appError } = await supabaseServer
      .from("apps")
      .select("id, organization_id")
      .eq("id", appId)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { success: false, error: "App not found" },
        { status: 404 },
      );
    }

    const isPlatformAdmin = userProfile.role === "platform_admin";
    const isOwnOrganization =
      userProfile.organization_id === app.organization_id;

    if (!isPlatformAdmin && !isOwnOrganization) {
      return NextResponse.json(
        { success: false, error: "Not allowed to view versions for this app" },
        { status: 403 },
      );
    }

    const { data: versions, error: versionsError } = await supabaseServer
      .from("app_versions")
      .select("id, version_number, prompt, storage_path, created_at")
      .eq("app_id", appId)
      .order("version_number", { ascending: false });

    if (versionsError) {
      return NextResponse.json(
        { success: false, error: versionsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      versions:
        versions?.map((v) => ({
          id: v.id,
          versionNumber: v.version_number,
          prompt: v.prompt,
          storagePath: v.storage_path,
          createdAt: v.created_at,
        })) ?? [],
    });
  } catch (error) {
    console.error("[get-app-versions] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
