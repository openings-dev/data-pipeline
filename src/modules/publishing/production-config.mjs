export const OPENINGS_PRODUCTION_PUBLISHING_ENDPOINT =
  "https://publishing-platform-production.business-850.workers.dev";

export function loadProductionPublishingConfig(environment = process.env) {
  const endpoint = required(environment, "PUBLISHING_ENDPOINT").replace(/\/+$/u, "");
  const clientId = required(environment, "PUBLISHING_CLIENT_ID");
  const secret = required(environment, "PUBLISHING_CLIENT_SECRET");

  if (endpoint !== OPENINGS_PRODUCTION_PUBLISHING_ENDPOINT) {
    throw new Error("PUBLISHING_ENDPOINT must use the approved production Worker.");
  }
  if (secret.length < 24) {
    throw new Error("PUBLISHING_CLIENT_SECRET must contain at least 24 characters.");
  }

  return { endpoint, clientId, secret };
}

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}
