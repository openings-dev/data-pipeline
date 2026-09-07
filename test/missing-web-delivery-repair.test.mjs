import assert from "node:assert/strict";
import test from "node:test";
import { buildMissingWebDeliveryRepairSql } from "../src/modules/publishing/missing-web-delivery-repair.mjs";

test("builds a bounded idempotent repair for an existing publication", () => {
  const publication = {
    identity: { tenant: "openings", sourceType: "job", sourceId: "gh_123", revision: "rev-1" },
    deliveries: [{ payload: { type: "web.page", entity: { id: "gh_123", title: "Dev's job" } } }],
  };

  const sql = buildMissingWebDeliveryRepairSql([
    { publicationId: "publication-1", publication },
  ]);

  assert.match(sql, /BEGIN TRANSACTION/u);
  assert.match(sql, /INSERT OR IGNORE INTO deliveries/u);
  assert.match(sql, /'web-r2'/u);
  assert.match(sql, /'web\.r2'/u);
  assert.match(sql, /INSERT OR IGNORE INTO outbox/u);
  assert.match(sql, /COMMIT/u);
  assert.doesNotMatch(sql, /Dev's job/u);
});

test("rejects broad or malformed repairs", () => {
  assert.throws(() => buildMissingWebDeliveryRepairSql([]), /at least one/u);
  assert.throws(() => buildMissingWebDeliveryRepairSql(new Array(11).fill({})), /at most 10/u);
  assert.throws(() => buildMissingWebDeliveryRepairSql([{ publicationId: "bad id", publication: {} }]), /publication id/u);
});
