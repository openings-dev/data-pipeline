export function buildOpportunityAliases(items) {
  const ids = {};

  for (const item of items) {
    ids[item.id] = item.id;
    if (item.sourceId) ids[item.sourceId] = item.id;
    for (const source of item.sources ?? []) {
      if (source.id) ids[source.id] = item.id;
      if (source.sourceId) ids[source.sourceId] = item.id;
    }
  }

  return { ids: Object.fromEntries(Object.entries(ids).sort(([left], [right]) => left.localeCompare(right))) };
}

