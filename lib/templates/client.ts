export async function getTemplates(organizationId?: string | null) {
  const query = organizationId
    ? `?organizationId=${encodeURIComponent(organizationId)}`
    : "";

  const res = await fetch(`/api/templates${query}`);
  return res.json();
}

export async function loadTemplate(templateId: string) {
  const res = await fetch(`/api/templates/${templateId}`);
  const data = await res.json();

  return {
    ok: res.ok,
    data,
  };
}
