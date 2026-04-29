/**
 * POST /api/apps/[appId]/publish
 *
 * Publishes the latest saved version of an app to its public runtime location.
 *
 * This route does not publish the raw source files directly. Instead, it:
 * 1. Authenticates the current Supabase user.
 * 2. Verifies the user is allowed to publish the requested app.
 * 3. Loads the latest saved app version from `app_versions`.
 * 4. Downloads that version's source files from the private `apps` storage bucket.
 * 5. Rebuilds the app in a temporary local directory.
 * 6. Uploads the generated `dist` build output to the public `published-apps` bucket.
 * 7. Updates the `apps` table with publish metadata:
 *    - `is_published`
 *    - `published_version_id`
 *    - `published_at`
 *
 * Published files are written to:
 * `{organizationId}/{appSlug}/dist`
 *
 * The public app route should load from this published build output, not from
 * the editable source version.
 */

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

function getContentType(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (filePath.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function POST(_request: Request, { params }: RouteParams) {
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

    const isPlatformAdmin = currentUser.role === "platform_admin";
    const isEditor = currentUser.role === "editor";
    const isOwnOrganization =
      currentUser.organization_id === app.organization_id;

    if (currentUser.role === "viewer") {
      return NextResponse.json(
        {
          success: false,
          error: "Viewers cannot publish apps",
        },
        { status: 403 },
      );
    }

    if (!isPlatformAdmin && !(isEditor && isOwnOrganization)) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to publish this app",
        },
        { status: 403 },
      );
    }

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
    const publishedBasePath = `${app.organization_id}/${app.slug}/dist`;

    const tempRoot = path.join(
      process.cwd(),
      ".publish-tmp",
      `${app.id}-${latestVersion.id}`,
    );

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
              contentType: getContentType(storageObjectPath),
            });

          if (uploadError) {
            throw new Error(
              `Failed to upload ${storageObjectPath}: ${uploadError.message}`,
            );
          }
        }),
      );
    }

    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
      await fs.mkdir(tempRoot, { recursive: true });

      await downloadFolder(sourceBasePath, tempRoot);

      await fs.access(path.join(tempRoot, "package.json"));
      await fs.access(path.join(tempRoot, "index.html"));

      const entryCandidates = ["main.jsx", "main.tsx", "main.js", "main.ts"];

      const hasEntry = await Promise.any(
        entryCandidates.map((file) =>
          fs.access(path.join(tempRoot, "src", file)).then(() => true),
        ),
      ).catch(() => false);

      if (!hasEntry) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Generated app is missing a valid Vite entry file in src/: main.jsx, main.tsx, main.js, or main.ts",
          },
          { status: 400 },
        );
      }

      await execFileAsync("npm", ["install"], { cwd: tempRoot });
      await execFileAsync("npm", ["run", "build"], { cwd: tempRoot });

      const distRoot = path.join(tempRoot, "dist");
      await fs.access(path.join(distRoot, "index.html"));

      await uploadFolder(distRoot, publishedBasePath);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }

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
