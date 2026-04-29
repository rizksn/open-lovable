import fs from "fs/promises";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

export function generatedAppPath() {
  return path.join(process.cwd(), "generated-app");
}

export function appVersionStoragePath(params: {
  organizationId: string;
  appSlug: string;
  versionNumber: number;
}) {
  return `${params.organizationId}/${params.appSlug}/versions/v${params.versionNumber}`;
}

export function appVersionLocalPath(params: {
  organizationId: string;
  appSlug: string;
  versionNumber: number;
}) {
  return path.join(
    process.cwd(),
    "storage",
    "apps",
    appVersionStoragePath(params),
  );
}

async function copyDirectoryContentsWithoutNodeModules(
  sourcePath: string,
  destinationPath: string,
) {
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  await fs.mkdir(destinationPath, { recursive: true });

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

export async function copyGeneratedAppToLocalVersion(params: {
  organizationId: string;
  appSlug: string;
  versionNumber: number;
}) {
  const from = generatedAppPath();
  const to = appVersionLocalPath(params);

  await fs.rm(to, { recursive: true, force: true });

  await copyDirectoryContentsWithoutNodeModules(from, to);

  return appVersionStoragePath(params);
}

async function walkFiles(rootPath: string): Promise<string[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  const files = await Promise.all(
    entries
      .filter((entry) => entry.name !== "node_modules")
      .map(async (entry) => {
        const fullPath = path.join(rootPath, entry.name);

        if (entry.isDirectory()) {
          return walkFiles(fullPath);
        }

        return [fullPath];
      }),
  );

  return files.flat();
}

export async function uploadGeneratedAppToSupabaseVersion(params: {
  supabase: SupabaseClient;
  organizationId: string;
  appSlug: string;
  versionNumber: number;
}) {
  const sourceRoot = generatedAppPath();
  const storageBasePath = `${appVersionStoragePath(params)}/source`;
  const files = await walkFiles(sourceRoot);

  await Promise.all(
    files.map(async (filePath) => {
      const relativePath = path.relative(sourceRoot, filePath);
      const storagePath = `${storageBasePath}/${relativePath}`;
      const fileBuffer = await fs.readFile(filePath);

      const { error } = await params.supabase.storage
        .from("apps")
        .upload(storagePath, fileBuffer, {
          upsert: true,
        });

      if (error) {
        throw new Error(
          `Failed to upload ${relativePath} to Supabase Storage: ${error.message}`,
        );
      }
    }),
  );

  return storageBasePath;
}

export async function hydrateGeneratedAppFromSupabaseVersion(params: {
  supabase: SupabaseClient;
  storagePath: string;
}) {
  const targetRoot = generatedAppPath();
  const tempRoot = path.join(process.cwd(), "generated-app.__hydrating_tmp");

  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(tempRoot, { recursive: true });

  const { data: objects, error: listError } = await params.supabase.storage
    .from("apps")
    .list(params.storagePath, {
      limit: 1000,
    });

  if (listError) {
    throw new Error(
      `Failed to list Supabase Storage files: ${listError.message}`,
    );
  }

  if (!objects || objects.length === 0) {
    throw new Error("No files found in Supabase Storage for this app version");
  }

  const loadedFiles: { path: string }[] = [];

  async function downloadFolder(
    storageFolderPath: string,
    localFolderPath: string,
  ) {
    await fs.mkdir(localFolderPath, { recursive: true });

    const { data: entries, error } = await params.supabase.storage
      .from("apps")
      .list(storageFolderPath, {
        limit: 1000,
      });

    if (error) {
      throw new Error(`Failed to list ${storageFolderPath}: ${error.message}`);
    }

    await Promise.all(
      (entries ?? []).map(async (entry) => {
        const storageObjectPath = `${storageFolderPath}/${entry.name}`;
        const localObjectPath = path.join(localFolderPath, entry.name);

        if (entry.metadata === null) {
          await downloadFolder(storageObjectPath, localObjectPath);
          return;
        }

        const { data, error: downloadError } = await params.supabase.storage
          .from("apps")
          .download(storageObjectPath);

        if (downloadError || !data) {
          throw new Error(
            `Failed to download ${storageObjectPath}: ${
              downloadError?.message ?? "No data returned"
            }`,
          );
        }

        const arrayBuffer = await data.arrayBuffer();

        await fs.mkdir(path.dirname(localObjectPath), { recursive: true });
        await fs.writeFile(localObjectPath, Buffer.from(arrayBuffer));

        const relativePath = path.relative(tempRoot, localObjectPath);
        loadedFiles.push({ path: relativePath });
      }),
    );
  }

  try {
    // 1. Download everything into temp folder first.
    await downloadFolder(params.storagePath, tempRoot);

    // 2. Validate required app files before touching generated-app.
    for (const requiredFile of [
      "package.json",
      "index.html",
      "src/main.jsx",
      "src/App.jsx",
    ]) {
      await fs.access(path.join(tempRoot, requiredFile));
    }

    // 3. Clear generated-app, but preserve node_modules.
    const existingEntries = await fs.readdir(targetRoot, {
      withFileTypes: true,
    });

    await Promise.all(
      existingEntries
        .filter((entry) => entry.name !== "node_modules")
        .map((entry) =>
          fs.rm(path.join(targetRoot, entry.name), {
            recursive: true,
            force: true,
          }),
        ),
    );

    // 4. Copy complete hydrated app into generated-app.
    await fs.cp(tempRoot, targetRoot, {
      recursive: true,
      force: true,
    });

    return loadedFiles;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function listSupabaseStorageFilesRecursively(params: {
  supabase: SupabaseClient;
  bucket: string;
  folderPath: string;
}): Promise<string[]> {
  const { data: entries, error } = await params.supabase.storage
    .from(params.bucket)
    .list(params.folderPath, {
      limit: 1000,
    });

  if (error) {
    throw new Error(`Failed to list ${params.folderPath}: ${error.message}`);
  }

  const files = await Promise.all(
    (entries ?? []).map(async (entry) => {
      const objectPath = `${params.folderPath}/${entry.name}`;

      if (entry.metadata === null) {
        return listSupabaseStorageFilesRecursively({
          supabase: params.supabase,
          bucket: params.bucket,
          folderPath: objectPath,
        });
      }

      return [objectPath];
    }),
  );

  return files.flat();
}

export async function deleteSupabaseAppStorage(params: {
  supabase: SupabaseClient;
  organizationId: string;
  appSlug: string;
}) {
  const appStoragePath = `${params.organizationId}/${params.appSlug}`;

  const filesToDelete = await listSupabaseStorageFilesRecursively({
    supabase: params.supabase,
    bucket: "apps",
    folderPath: appStoragePath,
  });

  if (filesToDelete.length === 0) {
    return;
  }

  const { error } = await params.supabase.storage
    .from("apps")
    .remove(filesToDelete);

  if (error) {
    throw new Error(`Failed to delete app storage files: ${error.message}`);
  }
}

export async function deleteSupabaseVersionStorage(params: {
  supabase: SupabaseClient;
  storagePath: string;
}) {
  const filesToDelete = await listSupabaseStorageFilesRecursively({
    supabase: params.supabase,
    bucket: "apps",
    folderPath: params.storagePath,
  });

  if (filesToDelete.length === 0) {
    return;
  }

  const { error } = await params.supabase.storage
    .from("apps")
    .remove(filesToDelete);

  if (error) {
    throw new Error(`Failed to delete version storage files: ${error.message}`);
  }
}
