export const AUTHOR_ARTIFACT_MAX_BYTES = 32 * 1024;

const unavailableLocations = new Set([
  "n/a", "na", "none", "not available", "null", "undefined", "unknown",
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function location(value) {
  const normalized = text(value);
  return unavailableLocations.has(normalized.toLowerCase()) ? "" : normalized;
}

function locationKey(country, region) {
  return country || region ? `${country}:::${region}` : null;
}

function mostFrequentLocation(locations) {
  const [entry] = [...locations.entries()].sort((left, right) =>
    right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  if (!entry) return { country: "", region: "" };
  const [country = "", region = ""] = entry[0].split(":::");
  return { country, region };
}

function normalizedHandle(value) {
  return text(value).replace(/^@+/u, "");
}

export function buildAuthorArtifacts(items, generatedAt) {
  const authors = new Map();

  for (const item of items) {
    if (item?.issueState !== "open") continue;
    const handle = normalizedHandle(item?.author?.handle);
    if (!handle) continue;
    const itemCountry = location(item.country);
    const itemRegion = location(item.region);
    const key = locationKey(itemCountry, itemRegion);
    const postedAtMs = Date.parse(text(item.createdAt));
    const existing = authors.get(handle);

    if (!existing) {
      authors.set(handle, {
        handle,
        name: text(item.author?.name) || handle,
        avatarUrl: text(item.author?.avatarUrl),
        opportunitiesCount: 1,
        lastPostedMs: Number.isFinite(postedAtMs) ? postedAtMs : null,
        locations: new Map(key ? [[key, 1]] : []),
      });
      continue;
    }

    existing.opportunitiesCount += 1;
    if (key) existing.locations.set(key, (existing.locations.get(key) ?? 0) + 1);
    if (Number.isFinite(postedAtMs) &&
        (existing.lastPostedMs === null || postedAtMs > existing.lastPostedMs)) {
      existing.lastPostedMs = postedAtMs;
    }
    if (!existing.avatarUrl) existing.avatarUrl = text(item.author?.avatarUrl);
  }

  return [...authors.values()].map((entry) => {
    const { country, region } = mostFrequentLocation(entry.locations);
    const payload = {
      schemaVersion: 1,
      generatedAt,
      author: {
        handle: entry.handle,
        name: entry.name,
        avatarUrl: entry.avatarUrl,
        region,
        country,
        opportunitiesCount: entry.opportunitiesCount,
        lastPostedAt: entry.lastPostedMs === null
          ? null
          : new Date(entry.lastPostedMs).toISOString(),
      },
    };
    const bytes = Buffer.byteLength(JSON.stringify(payload));
    if (bytes > AUTHOR_ARTIFACT_MAX_BYTES) {
      throw new Error(`Author artifact ${entry.handle} exceeds ${AUTHOR_ARTIFACT_MAX_BYTES} bytes`);
    }
    return {
      file: `api/authors/${encodeURIComponent(entry.handle)}.json`,
      payload,
      bytes,
    };
  }).sort((left, right) => left.file.localeCompare(right.file));
}
