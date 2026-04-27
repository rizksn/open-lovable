/**
 * App detail route.
 *
 * DELETE /api/apps/[appId]
 * Deletes an app, its saved versions, and its associated source files.
 *
 * Flow:
 * 1. Authenticate the current Supabase user.
 * 2. Load the requesting user's profile and role.
 * 3. Load the target app metadata.
 * 4. Verify the user can delete this app.
 * 5. Delete the app's saved source files from Supabase Storage.
 * 6. Delete all `app_versions` rows for the app.
 * 7. Delete the app row from `apps`.
 *
 * Important design note:
 * Storage is deleted before database rows so failures do not leave orphaned
 * source files without an app record pointing to them.
 *
 * Future hardening:
 * restrict destructive deletes to platform admins and/or organization admins,
 * and consider soft deletes for auditability.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteSupabaseAppStorage } from "@/lib/apps/storage";

export async function DELETE(
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
        { success: false, error: "Not allowed to delete this app" },
        { status: 403 },
      );
    }

    await deleteSupabaseAppStorage({
      supabase: supabaseServer,
      organizationId: app.organization_id,
      appSlug: app.slug,
    });

    const { error: versionsError } = await supabaseServer
      .from("app_versions")
      .delete()
      .eq("app_id", app.id);

    if (versionsError) {
      return NextResponse.json(
        { success: false, error: versionsError.message },
        { status: 500 },
      );
    }

    const { error: deleteAppError } = await supabaseServer
      .from("apps")
      .delete()
      .eq("id", app.id);

    if (deleteAppError) {
      return NextResponse.json(
        { success: false, error: deleteAppError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedAppId: app.id,
    });
  } catch (error) {
    console.error("[delete-app] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
