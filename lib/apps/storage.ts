import fs from "fs/promises";
import path from "path";

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
