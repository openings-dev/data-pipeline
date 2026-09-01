const DAY_MS = 86_400_000;

export function classifyFreshness(publishedAt, referenceAt) {
  const published = Date.parse(publishedAt ?? "");
  const reference = Date.parse(referenceAt ?? "");
  const ageDays = Number.isNaN(published) || Number.isNaN(reference)
    ? 0
    : Math.max(0, Math.floor((reference - published) / DAY_MS));
  const status = ageDays <= 30
    ? "fresh"
    : ageDays <= 90
      ? "aging"
      : "stale";

  return { ageDays, publishedAt, status };
}

