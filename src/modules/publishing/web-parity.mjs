function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function selectWebParityBatch(publications, { offset = 0, limit = 500 } = {}) {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Parity offset must be a non-negative integer.");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("Parity limit must be between 1 and 500.");
  }
  const selected = publications.slice(offset, offset + limit);
  const nextOffset = Math.min(offset + selected.length, publications.length);
  return {
    publications: selected,
    offset,
    nextOffset,
    total: publications.length,
    complete: nextOffset >= publications.length,
  };
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

export async function verifyWebPublicationWithRetry(fetchPublication, publication, {
  canonicalBaseUrl = "https://openings.dev",
  maximumAttempts = 3,
  retryDelayMs = 1_000,
} = {}) {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 5) {
    throw new Error("Maximum parity attempts must be between one and five.");
  }
  if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 10_000) {
    throw new Error("Parity retry delay must be between zero and ten seconds.");
  }

  let issues = [];
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      issues = await verifyWebPublication(
        await fetchPublication(),
        publication,
        canonicalBaseUrl,
      );
    } catch (error) {
      issues = [error instanceof Error ? error.message : String(error)];
    }
    if (issues.length === 0 || attempt === maximumAttempts) return issues;
    if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  return issues;
}
