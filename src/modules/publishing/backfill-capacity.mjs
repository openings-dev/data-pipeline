export function assertBackfillCapacity(capacity, estimate) {
  const requested = { d1Rows: estimate.d1Rows, queueOperations: estimate.queueOperations, r2Bytes: estimate.r2Bytes };
  for (const row of capacity) {
    const amount = requested[row.resource];
    if (amount === undefined) continue;
    if (!Number.isFinite(row.projected) || !Number.isFinite(row.free_allowance)) throw new Error("Capacity accounting is uncertain.");
    if ((row.projected + amount) / row.free_allowance >= 0.4) {
      throw new Error(`Backfill would reach 40% of free ${row.resource} capacity.`);
    }
  }
  return true;
}
