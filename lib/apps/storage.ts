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

export async function copyGeneratedAppToLocalVersion(params: {
  organizationId: string;
  appSlug: string;
  versionNumber: number;
}) {
  const from = generatedAppPath();
  const to = appVersionLocalPath(params);

  await fs.rm(to, { recursive: true, force: true });
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });

  return appVersionStoragePath(params);
}
