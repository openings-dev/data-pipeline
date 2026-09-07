export function mergePublishingOutbox(existing, additions) {
  const byKey = new Map();
  for (const envelope of [...existing, ...additions]) {
    const key = envelope?.identity?.idempotencyKey;
    if (typeof key !== "string" || key.length === 0) throw new Error("Publication idempotency key is required.");
    if (!byKey.has(key)) byKey.set(key, envelope);
  }
  return [...byKey.values()];
}

export async function dispatchPublishingOutbox(outbox, send) {
  const remaining = [];
  let accepted = 0;
  for (const envelope of outbox) {
    try {
      const response = await send(envelope);
      if (response.status === 202) accepted += 1;
      else remaining.push(envelope);
    } catch {
      remaining.push(envelope);
    }
  }
  return { accepted, remaining };
}
