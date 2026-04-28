export async function getOrganizations() {
  const res = await fetch("/api/organizations");
  return res.json();
}

export async function createOrganization(payload: {
  name: string;
  slug: string;
}) {
  const res = await fetch("/api/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}
