/**
 * Specific app version load route.
 *
 * GET /api/apps/[appId]/versions/[versionNumber]
 * Loads a selected saved version of an app into the live builder workspace.
 *
 * Flow:
 * 1. Parse and validate the requested version number.
 * 2. Authenticate the current Supabase user.
 * 3. Load the user's profile and role.
 * 4. Load the target app metadata.
 * 5. Verify the user can access this app.
 * 6. Load the requested `app_versions` row.
 * 7. Download that version's saved source files from Supabase Storage.
 * 8. Hydrate those files into `generated-app/` for preview/editing.
 *
 * Important design note:
 * Loading an older version does not publish or overwrite app history.
 * It only restores that source snapshot into the temporary builder workspace.
 *
 * Future hardening:
 * add audit logging for version loads and ensure role permissions distinguish
 * viewers, editors, and admins.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateGeneratedAppFromSupabaseVersion } from "@/lib/apps/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string; versionNumber: string }> },
) {
  try {
    const { appId, versionNumber } = await params;

    const versionNum = parseInt(versionNumber, 10);

    if (Number.isNaN(versionNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid version number" },
        { status: 400 },
      );
    }

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

    const { data: userProfile, error: userError } = await supabase
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

    const { data: app, error: appError } = await supabase
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
    const isOwnOrganization =
      userProfile.organization_id === app.organization_id;

    if (!isPlatformAdmin && !isOwnOrganization) {
      return NextResponse.json(
        { success: false, error: "Not allowed to load this version" },
        { status: 403 },
      );
    }

    const { data: version, error: versionError } = await supabase
      .from("app_versions")
      .select("version_number, prompt, storage_path, created_at")
      .eq("app_id", appId)
      .eq("version_number", versionNum)
      .maybeSingle();

    if (versionError || !version) {
      return NextResponse.json(
        { success: false, error: "Version not found" },
        { status: 404 },
      );
    }

    if (!version.storage_path) {
      return NextResponse.json(
        { success: false, error: "Version has no storage path" },
        { status: 500 },
      );
    }

    const files = await hydrateGeneratedAppFromSupabaseVersion({
      supabase,
      storagePath: version.storage_path,
    });

    return NextResponse.json({
      success: true,
      version: {
        versionNumber: version.version_number,
        prompt: version.prompt,
        storagePath: version.storage_path,
        createdAt: version.created_at,
      },
      hydratedPath: "generated-app",
      files,
    });
  } catch (error) {
    console.error("[load-version] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
