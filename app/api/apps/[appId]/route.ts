import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    const organizationStoragePath = path.join(
      process.cwd(),
      "storage",
      "apps",
      app.organization_id,
    );

    const appStoragePath = path.join(organizationStoragePath, app.slug);

    await fs.rm(appStoragePath, { recursive: true, force: true });

    try {
      const remainingEntries = await fs.readdir(organizationStoragePath);

      if (remainingEntries.length === 0) {
        await fs.rmdir(organizationStoragePath);
      }
    } catch {
      // Organization folder may not exist or may already be removed.
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
