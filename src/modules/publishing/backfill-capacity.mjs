export function assertBackfillCapacity(capacity, estimate) {
  const requested = {
    d1RowsRead: estimate.d1RowsRead,
    d1RowsWritten: estimate.d1RowsWritten,
    queueOperations: estimate.queueOperations,
    r2Bytes: estimate.r2Bytes,
  };
  const indexed = new Map(capacity.map((row) => [row.resource, row]));
  for (const [resource, amount] of Object.entries(requested)) {
    const row = indexed.get(resource);
    if (!row) throw new Error(`Capacity accounting is uncertain: ${resource} is missing.`);
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`Capacity accounting is uncertain: ${resource} estimate is invalid.`);
    if (!Number.isFinite(row.projected) || !Number.isFinite(row.free_allowance)) throw new Error("Capacity accounting is uncertain.");
    if ((row.projected + amount) / row.free_allowance >= 0.4) {
      throw new Error(`Backfill would reach 40% of free ${resource} capacity.`);
    }
  }
  return true;
}
