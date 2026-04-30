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
  if (filePath.endsWith(".ico")) return "image/x-icon";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

export async function POST(_request: Request, { params }: RouteParams) {
  const supabase = await createSupabaseServerClient();

  let deploymentId: string | null = null;
  let tempRoot: string | null = null;

  try {
    const { appId } = await params;

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
        { success: false, error: "User profile not found" },
        { status: 403 },
      );
    }

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select(
        "id, slug, organization_id, current_version_id, published_version_id",
      )
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
        { success: false, error: "Viewers cannot publish apps" },
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

    if (!app.current_version_id) {
      return NextResponse.json(
        { success: false, error: "No saved version found to publish" },
        { status: 400 },
      );
    }

    const { data: currentVersion, error: versionError } = await supabase
      .from("app_versions")
      .select("id, version_number, storage_path")
      .eq("id", app.current_version_id)
      .eq("app_id", app.id)
      .single();

    if (versionError || !currentVersion) {
      return NextResponse.json(
        { success: false, error: "Current saved version not found" },
        { status: 404 },
      );
    }

    const publishedBasePath = `${app.organization_id}/${app.slug}/dist`;
    const publicBaseUrl =
      process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
    const publicUrl = `${publicBaseUrl}/published/${app.slug}`;

    console.log("[publish-app] publish requested", {
      appId: app.id,
      slug: app.slug,
      organizationId: app.organization_id,
      currentVersionId: currentVersion.id,
      currentVersionNumber: currentVersion.version_number,
      sourceStoragePath: currentVersion.storage_path,
      publishedBasePath,
      userId: user.id,
      role: userProfile.role,
    });

    const { data: existingDeployment, error: existingDeploymentError } =
      await supabase
        .from("app_deployments")
        .select("id, public_slug")
        .eq("app_id", app.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingDeploymentError) {
      throw new Error(existingDeploymentError.message);
    }

    if (existingDeployment) {
      deploymentId = existingDeployment.id;

      const { error: resetDeploymentError } = await supabase
        .from("app_deployments")
        .update({
          app_version_id: currentVersion.id,
          public_slug: app.slug,
          public_url: publicUrl,
          storage_path: publishedBasePath,
          status: "pending",
          deployed_by_user_id: user.id,
          deployed_at: null,
        })
        .eq("id", existingDeployment.id);

      if (resetDeploymentError) {
        throw new Error(resetDeploymentError.message);
      }
    } else {
      const { data: createdDeployment, error: createDeploymentError } =
        await supabase
          .from("app_deployments")
          .insert({
            app_id: app.id,
            app_version_id: currentVersion.id,
            public_slug: app.slug,
            public_url: publicUrl,
            storage_path: publishedBasePath,
            status: "pending",
            deployed_by_user_id: user.id,
            deployed_at: null,
          })
          .select("id")
          .single();

      if (createDeploymentError || !createdDeployment) {
        throw new Error(
          createDeploymentError?.message ?? "Failed to create deployment row",
        );
      }

      deploymentId = createdDeployment.id;
    }

    console.log("[publish-app] deployment marked pending", {
      deploymentId,
      appId: app.id,
      appVersionId: currentVersion.id,
      storagePath: publishedBasePath,
    });

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

    tempRoot = path.join(
      process.cwd(),
      ".publish-tmp",
      `${app.id}-${currentVersion.id}`,
    );

    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
      await fs.mkdir(tempRoot, { recursive: true });

      await downloadFolder(currentVersion.storage_path, tempRoot);

      await fs.access(path.join(tempRoot, "package.json"));
      await fs.access(path.join(tempRoot, "index.html"));

      const entryCandidates = ["main.jsx", "main.tsx", "main.js", "main.ts"];

      const hasEntry = await Promise.any(
        entryCandidates.map((file) =>
          fs.access(path.join(tempRoot!, "src", file)).then(() => true),
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
      if (tempRoot) {
        await fs.rm(tempRoot, { recursive: true, force: true });
      }
    }

    const deployedAt = new Date().toISOString();

    const { error: finalizeDeploymentError } = await supabase
      .from("app_deployments")
      .update({
        app_version_id: currentVersion.id,
        public_slug: app.slug,
        public_url: publicUrl,
        storage_path: publishedBasePath,
        status: "success",
        deployed_by_user_id: user.id,
        deployed_at: deployedAt,
      })
      .eq("id", deploymentId);

    if (finalizeDeploymentError) {
      throw new Error(finalizeDeploymentError.message);
    }

    const { error: updateAppError } = await supabase
      .from("apps")
      .update({
        status: "published",
        is_published: true,
        published_version_id: currentVersion.id,
        published_at: deployedAt,
      })
      .eq("id", app.id);

    if (updateAppError) {
      throw new Error(
        `Failed to update app publish status: ${updateAppError.message}`,
      );
    }

    console.log("[publish-app] publish succeeded", {
      deploymentId,
      appId: app.id,
      appVersionId: currentVersion.id,
      publishedStoragePath: publishedBasePath,
      publicUrl,
      deployedAt,
    });

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        slug: app.slug,
        organizationId: app.organization_id,
        isPublished: true,
        publishedVersionId: currentVersion.id,
        publishedAt: deployedAt,
        publishedVersionNumber: currentVersion.version_number,
      },
      deployment: {
        id: deploymentId,
        appVersionId: currentVersion.id,
        publicSlug: app.slug,
        publicUrl,
        storagePath: publishedBasePath,
        status: "success",
        deployedAt,
      },
    });
  } catch (error) {
    if (deploymentId) {
      try {
        await supabase
          .from("app_deployments")
          .update({
            status: "failed",
            deployed_at: null,
          })
          .eq("id", deploymentId);
      } catch (deploymentCleanupError) {
        console.error("[publish-app] failed to mark deployment as failed", {
          deploymentId,
          deploymentCleanupError,
        });
      }
    }

    if (tempRoot) {
      try {
        await fs.rm(tempRoot, { recursive: true, force: true });
      } catch (tempCleanupError) {
        console.error("[publish-app] failed to clean temp folder", {
          tempRoot,
          tempCleanupError,
        });
      }
    }

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
