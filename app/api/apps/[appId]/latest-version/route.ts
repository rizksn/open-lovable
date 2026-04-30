/**
 * Latest app version route.
 *
 * GET /api/apps/[appId]/latest-version
 * Loads the newest saved version of an app into the live builder workspace.
 *
 * Flow:
 * 1. Authenticate the current Supabase user.
 * 2. Load the target app metadata.
 * 3. Find the highest `version_number` for that app.
 * 4. Read the version's `storage_path`.
 * 5. Download the saved source files from Supabase Storage.
 * 6. Hydrate those files into `generated-app/` for live preview/editing.
 * 7. Return app/version metadata and the list of hydrated files.
 *
 * Important design note:
 * This route does not publish the app.
 * It only restores saved source code into the temporary builder workspace.
 *
 * Future hardening:
 * add organization/role access checks before hydrating tenant-owned app files.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateGeneratedAppFromSupabaseVersion } from "@/lib/apps/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "Invalid user" },
        { status: 401 },
      );
    }

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id, name, slug, organization_id, current_version_id")
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
        { success: false, error: "Not allowed to load this app" },
        { status: 403 },
      );
    }

    if (!app.current_version_id) {
      return NextResponse.json(
        { success: false, error: "App has no current version" },
        { status: 404 },
      );
    }

    const { data: currentVersion, error: versionError } = await supabase
      .from("app_versions")
      .select("id, app_id, version_number, storage_path, created_at")
      .eq("id", app.current_version_id)
      .eq("app_id", app.id)
      .maybeSingle();

    if (versionError || !currentVersion) {
      return NextResponse.json(
        { success: false, error: "Current app version not found" },
        { status: 404 },
      );
    }

    if (!currentVersion.storage_path) {
      return NextResponse.json(
        { success: false, error: "Current version has no storage path" },
        { status: 500 },
      );
    }

    const files = await hydrateGeneratedAppFromSupabaseVersion({
      supabase,
      storagePath: currentVersion.storage_path,
    });

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        organizationId: app.organization_id,
      },
      version: {
        id: currentVersion.id,
        versionNumber: currentVersion.version_number,
        storagePath: currentVersion.storage_path,
        createdAt: currentVersion.created_at,
      },
      hydratedPath: "generated-app",
      files,
    });
  } catch (error) {
    console.error("[latest-version] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load current app version" },
      { status: 500 },
    );
  }
}
