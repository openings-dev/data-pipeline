const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

const D1_DAILY_USAGE_QUERY = `query D1DailyUsage($accountTag: string!, $date: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      d1AnalyticsAdaptiveGroups(
        limit: 10000
        filter: { date_geq: $date, date_leq: $date }
      ) {
        sum { rowsRead rowsWritten }
      }
    }
  }
}`;

export async function loadD1AccountUsage({ accountId, apiToken, fetchImpl = fetch, now = new Date() }) {
  if (!accountId || !apiToken) throw new Error("Cloudflare capacity accounting is uncertain: credentials are missing.");
  const date = now.toISOString().slice(0, 10);
  const response = await fetchImpl(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
    body: JSON.stringify({ query: D1_DAILY_USAGE_QUERY, variables: { accountTag: accountId, date } }),
  });
  if (!response.ok) throw new Error(`Cloudflare capacity accounting is uncertain: Analytics returned HTTP ${response.status}.`);
  const document = await response.json();
  if (document.errors?.length) throw new Error("Cloudflare capacity accounting is uncertain: Analytics returned errors.");
  const accounts = document.data?.viewer?.accounts;
  if (!Array.isArray(accounts) || accounts.length !== 1) {
    throw new Error("Cloudflare capacity accounting is uncertain: account usage is missing.");
  }
  const groups = accounts[0].d1AnalyticsAdaptiveGroups;
  if (!Array.isArray(groups)) throw new Error("Cloudflare capacity accounting is uncertain: D1 usage is missing.");
  const totals = groups.reduce((result, group) => ({
    rowsRead: result.rowsRead + finite(group?.sum?.rowsRead),
    rowsWritten: result.rowsWritten + finite(group?.sum?.rowsWritten),
  }), { rowsRead: 0, rowsWritten: 0 });
  return [
    { resource: "d1RowsRead", projected: totals.rowsRead, free_allowance: 5_000_000 },
    { resource: "d1RowsWritten", projected: totals.rowsWritten, free_allowance: 100_000 },
  ];
}

function finite(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Cloudflare capacity accounting is uncertain: usage is invalid.");
  return value;
}
