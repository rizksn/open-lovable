export async function getTemplates() {
  const res = await fetch("/api/templates");
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
