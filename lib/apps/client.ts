export async function getAppsByOrganization(organizationId: string) {
  const res = await fetch(`/api/apps?organizationId=${organizationId}`);
  return res.json();
}

export async function getLatestAppVersion(appId: string) {
  const res = await fetch(`/api/apps/${appId}/latest-version`);
  const data = await res.json();

  return {
    ok: res.ok,
    data,
  };
}

export async function getAppVersions(appId: string) {
  const res = await fetch(`/api/apps/${appId}/versions`);
  return res.json();
}

export async function getAppVersion(appId: string, versionNumber: number) {
  const res = await fetch(`/api/apps/${appId}/versions/${versionNumber}`);
  return res.json();
}

export async function restartVitePreview() {
  const res = await fetch("/api/restart-vite", {
    method: "POST",
  });

  return {
    ok: res.ok,
  };
}

export async function saveApp(payload: {
  organizationId: string;
  name: string;
  prompt: string;
  files: unknown[];
}) {
  const res = await fetch("/api/apps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function saveAppVersion(
  appId: string,
  payload: {
    prompt: string;
    files: unknown[];
  },
) {
  const res = await fetch(`/api/apps/${appId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function publishApp(appId: string) {
  const res = await fetch(`/api/apps/${appId}/publish`, {
    method: "POST",
  });

  const data = await res.json();

  return {
    ok: res.ok,
    data,
  };
}

export async function deleteApp(appId: string) {
  const res = await fetch(`/api/apps/${appId}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function generateApp(payload: {
  prompt: string;
  isEdit: boolean;
}) {
  const res = await fetch("/api/outrival-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  return {
    ok: res.ok,
    data,
  };
}

export async function resetGeneratedApp() {
  const res = await fetch("/api/generated-app/reset", {
    method: "POST",
  });

  return res.json();
}
