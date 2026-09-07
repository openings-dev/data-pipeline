const SAFE_ID = /^[A-Za-z0-9:._-]+$/u;

export function buildMissingWebDeliveryRepairSql(repairs) {
  if (!Array.isArray(repairs) || repairs.length === 0) throw new Error("Repair requires at least one publication.");
  if (repairs.length > 10) throw new Error("Repair accepts at most 10 publications.");

  const statements = repairs.flatMap(({ publicationId, publication }) => {
    if (typeof publicationId !== "string" || !SAFE_ID.test(publicationId)) {
      throw new Error("Repair publication id is invalid.");
    }
    const tenant = publication?.identity?.tenant;
    const payload = publication?.deliveries?.[0]?.payload;
    if (typeof tenant !== "string" || !SAFE_ID.test(tenant) || payload?.type !== "web.page" || !payload.entity) {
      throw new Error(`Repair publication ${publicationId} has no valid web entity payload.`);
    }
    const deliveryId = `repair:web-r2:${publicationId}`;
    const outboxId = `repair:web-r2:${publicationId}:outbox`;
    return [
      `INSERT OR IGNORE INTO deliveries (id, tenant_id, publication_id, delivery_key, adapter, operation, required, payload_json, state) VALUES ('${deliveryId}', '${tenant}', '${publicationId}', 'web-r2', 'web.r2', 'publish', 1, ${hexText(JSON.stringify(payload))}, 'planned');`,
      `INSERT OR IGNORE INTO outbox (id, tenant_id, delivery_id, event_type, payload_json, due_at) VALUES ('${outboxId}', '${tenant}', '${deliveryId}', 'delivery.ready', ${hexText(JSON.stringify({ deliveryId }))}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));`,
    ];
  });

  return [...statements, ""].join("\n");
}

function hexText(value) {
  return `CAST(X'${Buffer.from(value, "utf8").toString("hex")}' AS TEXT)`;
}
