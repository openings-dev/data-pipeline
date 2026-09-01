function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchText(item) {
  return normalizeText(
    [
      item.title,
      item.excerpt,
      item.companyName,
      item.repository,
      item.country,
      item.region,
      item.author?.name,
      item.author?.handle,
      ...(Array.isArray(item.tags) ? item.tags : []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function buildSearchFields(item) {
  return {
    title: normalizeText(item.title),
    company: normalizeText(item.companyName),
    taxonomy: normalizeText(Object.values(item.taxonomy ?? {}).flat().join(" ")),
    location: normalizeText([
      item.jobLocation?.displayText,
      item.jobLocation?.city,
      item.jobLocation?.subdivision,
      item.jobLocation?.country,
      item.jobLocation?.region,
    ].filter(Boolean).join(" ")),
    excerpt: normalizeText(item.excerpt),
    source: normalizeText([
      item.repository,
      item.author?.name,
      item.author?.handle,
      ...(item.sources ?? []).map((source) => source.repository),
    ].filter(Boolean).join(" ")),
  };
}

export function buildSearchIndex(items) {
  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    text: buildSearchText(item),
    fields: buildSearchFields(item),
  }));
}
