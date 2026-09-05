function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function verifyWebPublication(response, publication, canonicalBaseUrl = "https://openings.dev") {
  const entity = publication.deliveries[0].payload.entity;
  const issues = [];
  if (!response.ok) issues.push(`HTTP ${response.status}`);
  if (!response.headers.get("x-publishing-revision")) issues.push("missing publishing revision");
  const html = await response.text();
  const canonicalUrl = new URL(entity.canonicalPath, canonicalBaseUrl).toString();
  if (!html.includes(escapeHtml(entity.title))) issues.push("missing title");
  if (!html.includes(escapeHtml(canonicalUrl))) issues.push("missing canonical URL");
  return issues;
}
