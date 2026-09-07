export async function dispatchBackfill(publications, send, concurrency = 4) {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("Backfill concurrency must be between 1 and 8.");
  }
  let cursor = 0;
  let accepted = 0;
  const failures = [];
  async function worker() {
    while (cursor < publications.length) {
      const index = cursor++;
      const publication = publications[index];
      try {
        const response = await send(publication);
        if (response.status === 202) accepted += 1;
        else failures.push({ idempotencyKey: publication.identity.idempotencyKey, status: response.status });
      } catch {
        failures.push({ idempotencyKey: publication.identity.idempotencyKey, status: 0 });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, publications.length) }, worker));
  return { accepted, failures: failures.sort((a, b) => a.idempotencyKey.localeCompare(b.idempotencyKey)) };
}
