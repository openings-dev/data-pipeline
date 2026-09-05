import { createHash, createHmac, randomUUID } from "node:crypto";

const PATH = "/v1/publications";

export async function buildPublishingHeaders({ clientId, secret, tenant, timestamp, nonce, body }) {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = ["POST", PATH, tenant, timestamp, nonce, bodyHash].join("\n");
  return {
    "content-type": "application/json",
    "x-pub-client": clientId,
    "x-pub-tenant": tenant,
    "x-pub-timestamp": timestamp,
    "x-pub-nonce": nonce,
    "x-pub-content-sha256": bodyHash,
    "x-pub-signature": createHmac("sha256", secret).update(canonical).digest("hex"),
  };
}

export function createPublishingSender({
  endpoint,
  clientId,
  secret,
  fetchImpl = fetch,
  now = () => new Date(),
  createNonce = randomUUID,
}) {
  const intakeUrl = new URL(PATH, endpoint).toString();
  return async (envelope) => {
    const body = JSON.stringify(envelope);
    const timestamp = now().toISOString();
    const headers = await buildPublishingHeaders({
      clientId,
      secret,
      tenant: envelope.identity.tenant,
      timestamp,
      nonce: createNonce(),
      body,
    });
    const response = await fetchImpl(intakeUrl, { method: "POST", headers, body });
    return { status: response.status, retryAfter: response.headers.get("retry-after") };
  };
}
