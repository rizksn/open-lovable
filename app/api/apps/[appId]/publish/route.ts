import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type RouteParams = {
  params: Promise<{ appId: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { appId } = await params;

    const supabase = await createSupabaseServerClient();

    // --- AUTH ---
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

    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 403 },
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

    const canPublish =
      currentUser.role === "platform_admin" ||
      currentUser.organization_id === app.organization_id;

    if (!canPublish) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to publish this app",
        },
        { status: 403 },
      );
    }

    // --- GET LATEST VERSION ---
    const { data: latestVersion, error: versionError } = await supabase
      .from("app_versions")
      .select("id, version_number, storage_path")
      .eq("app_id", appId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (versionError || !latestVersion) {
      return NextResponse.json(
        { success: false, error: "No saved version found to publish" },
        { status: 404 },
      );
    }

    const sourceBasePath = latestVersion.storage_path;

    // 🔥 NOW WE PUBLISH DIST, NOT SOURCE
    const publishedBasePath = `${app.organization_id}/${app.slug}/dist`;

    const tempRoot = path.join(
      process.cwd(),
      ".publish-tmp",
      `${app.id}-${latestVersion.id}`,
    );

    // --- DOWNLOAD SOURCE FROM SUPABASE ---
    async function downloadFolder(
      storageFolderPath: string,
      localFolderPath: string,
    ) {
      await fs.mkdir(localFolderPath, { recursive: true });

      const { data: entries, error: listError } = await supabase.storage
        .from("apps")
        .list(storageFolderPath, { limit: 1000 });

      if (listError) {
        throw new Error(
          `Failed to list ${storageFolderPath}: ${listError.message}`,
        );
      }

      await Promise.all(
        (entries ?? []).map(async (entry) => {
          const storageObjectPath = `${storageFolderPath}/${entry.name}`;
          const localObjectPath = path.join(localFolderPath, entry.name);

          if (entry.metadata === null) {
            await downloadFolder(storageObjectPath, localObjectPath);
            return;
          }

          const { data: fileData, error: downloadError } =
            await supabase.storage.from("apps").download(storageObjectPath);

          if (downloadError || !fileData) {
            throw new Error(
              `Failed to download ${storageObjectPath}: ${
                downloadError?.message ?? "No data returned"
              }`,
            );
          }

          const buffer = Buffer.from(await fileData.arrayBuffer());

          await fs.mkdir(path.dirname(localObjectPath), { recursive: true });
          await fs.writeFile(localObjectPath, buffer);
        }),
      );
    }

    // --- UPLOAD DIST TO SUPABASE ---
    async function uploadFolder(
      localFolderPath: string,
      storageFolderPath: string,
    ) {
      const entries = await fs.readdir(localFolderPath, {
        withFileTypes: true,
      });

      await Promise.all(
        entries.map(async (entry) => {
          const localObjectPath = path.join(localFolderPath, entry.name);
          const storageObjectPath = `${storageFolderPath}/${entry.name}`;

          if (entry.isDirectory()) {
            await uploadFolder(localObjectPath, storageObjectPath);
            return;
          }

          const fileBuffer = await fs.readFile(localObjectPath);

          const { error: uploadError } = await supabase.storage
            .from("published-apps")
            .upload(storageObjectPath, fileBuffer, {
              upsert: true,
            });

          if (uploadError) {
            throw new Error(
              `Failed to upload ${storageObjectPath}: ${uploadError.message}`,
            );
          }
        }),
      );
    }

    // --- MAIN FLOW ---
    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
      await fs.mkdir(tempRoot, { recursive: true });

      // 1. Download source
      await downloadFolder(sourceBasePath, tempRoot);

      // 2. Validate minimal app structure
      await fs.access(path.join(tempRoot, "package.json"));
      await fs.access(path.join(tempRoot, "index.html"));
      await fs.access(path.join(tempRoot, "src", "main.jsx"));

      // 3. Install deps
      await execFileAsync("npm", ["install"], { cwd: tempRoot });

      // 4. Build app
      await execFileAsync("npm", ["run", "build"], { cwd: tempRoot });

      const distRoot = path.join(tempRoot, "dist");

      await fs.access(path.join(distRoot, "index.html"));

      // 5. Upload dist
      await uploadFolder(distRoot, publishedBasePath);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }

    // --- UPDATE DB ---
    const publishedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("apps")
      .update({
        is_published: true,
        published_version_id: latestVersion.id,
        published_at: publishedAt,
      })
      .eq("id", appId);

    if (updateError) {
      throw new Error(
        `Failed to update app publish status: ${updateError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        slug: app.slug,
        organizationId: app.organization_id,
        isPublished: true,
        publishedVersionId: latestVersion.id,
        publishedAt,
        publishedVersionNumber: latestVersion.version_number,
        publishedStoragePath: publishedBasePath,
      },
    });
  } catch (error) {
    console.error("[publish-app] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish app",
      },
      { status: 500 },
    );
  }
}
