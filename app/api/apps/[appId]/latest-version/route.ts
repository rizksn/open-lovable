import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoadedFile = {
  path: string;
  content: string;
};

async function readFilesRecursively(
  directoryPath: string,
  basePath = directoryPath,
): Promise<LoadedFile[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return readFilesRecursively(fullPath, basePath);
      }

      const content = await fs.readFile(fullPath, "utf8");
      const relativePath = path.relative(basePath, fullPath);

      return [{ path: relativePath, content }];
    }),
  );

  return files.flat();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id, name, slug, organization_id")
      .eq("id", appId)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { success: false, error: "App not found" },
        { status: 404 },
      );
    }

    const { data: latestVersion, error: versionError } = await supabase
      .from("app_versions")
      .select("id, app_id, version_number, storage_path, created_at")
      .eq("app_id", appId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError || !latestVersion) {
      return NextResponse.json(
        { success: false, error: "No saved version found for this app" },
        { status: 404 },
      );
    }

    if (!latestVersion.storage_path) {
      return NextResponse.json(
        { success: false, error: "Latest version has no storage path" },
        { status: 500 },
      );
    }

    const versionPath = path.join(
      process.cwd(),
      "storage",
      "apps",
      latestVersion.storage_path,
    );

    try {
      await fs.access(versionPath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Saved app files not found" },
        { status: 404 },
      );
    }

    const files = await readFilesRecursively(versionPath);

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        organizationId: app.organization_id,
      },
      version: {
        id: latestVersion.id,
        versionNumber: latestVersion.version_number,
        storagePath: latestVersion.storage_path,
        createdAt: latestVersion.created_at,
      },
      files,
    });
  } catch (error) {
    console.error("[latest-version] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load latest app version" },
      { status: 500 },
    );
  }
}
