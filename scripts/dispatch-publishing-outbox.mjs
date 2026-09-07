import { resolve } from "node:path";

import { createPublishingSender } from "../src/modules/publishing/publishing-client.mjs";
import { dispatchPublishingOutbox } from "../src/modules/publishing/publishing-outbox.mjs";
import { readJsonIfExists } from "../src/modules/storage/read-json-if-exists.mjs";
import { writeJsonIfChanged } from "../src/modules/storage/write-json-if-changed.mjs";

const endpoint = process.env.PUBLISHING_SHADOW_ENDPOINT;
const clientId = process.env.PUBLISHING_CLIENT_ID;
const secret = process.env.PUBLISHING_CLIENT_SECRET;
if (!endpoint || !clientId || !secret) {
  console.log("publishing-shadow-disabled: credentials or endpoint absent");
  process.exit(0);
}

const outboxPath = resolve(process.cwd(), "snapshots", "publishing", "outbox.json");
const stored = await readJsonIfExists(outboxPath);
const publications = stored?.publications ?? [];
const send = createPublishingSender({ endpoint, clientId, secret });
const result = await dispatchPublishingOutbox(publications, send);
await writeJsonIfChanged(outboxPath, { schemaVersion: 1, publications: result.remaining });
console.log(`publishing-shadow: accepted=${result.accepted} pending=${result.remaining.length}`);
