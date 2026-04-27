import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function copyDirectoryContents(
  sourcePath: string,
  destinationPath: string,
) {
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.name !== "node_modules")
      .map((entry) =>
        fs.cp(
          path.join(sourcePath, entry.name),
          path.join(destinationPath, entry.name),
          {
            recursive: true,
            force: true,
          },
        ),
      ),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string; versionNumber: string }> },
) {
  try {
    const { appId, versionNumber } = await params;

    const versionNum = parseInt(versionNumber, 10);

    if (isNaN(versionNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid version number" },
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
    const isOwnOrganization =
      userProfile.organization_id === app.organization_id;

    if (!isPlatformAdmin && !isOwnOrganization) {
      return NextResponse.json(
        { success: false, error: "Not allowed to load this version" },
        { status: 403 },
      );
    }

    const { data: version, error: versionError } = await supabaseServer
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

    const versionPath = path.join(
      process.cwd(),
      "storage",
      "apps",
      version.storage_path,
    );

    try {
      await fs.access(versionPath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Saved version files not found" },
        { status: 404 },
      );
    }

    const generatedAppPath = path.join(process.cwd(), "generated-app");

    const entries = await fs.readdir(generatedAppPath, { withFileTypes: true });

    await Promise.all(
      entries
        .filter((entry) => entry.name !== "node_modules")
        .map((entry) =>
          fs.rm(path.join(generatedAppPath, entry.name), {
            recursive: true,
            force: true,
          }),
        ),
    );

    await copyDirectoryContents(versionPath, generatedAppPath);

    return NextResponse.json({
      success: true,
      version: {
        versionNumber: version.version_number,
        prompt: version.prompt,
        storagePath: version.storage_path,
        createdAt: version.created_at,
      },
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
