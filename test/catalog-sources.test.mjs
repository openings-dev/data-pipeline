import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { readRepositoryCatalog } from "../src/modules/catalog/catalog-repository.mjs";
import { mapIssueToOpportunity } from "../src/modules/opportunities/opportunity-mapper.mjs";
import { readDiscoveryDecisions } from "../src/modules/discovery/read-discovery-contract.mjs";
import { activeDecisionKeys } from "../src/modules/discovery/discovery-groups.mjs";

test("maintenance-only issue sources are excluded from ingestion", async () => {
  const catalog = await readRepositoryCatalog(
    resolve(process.cwd(), "src/modules/catalog/repositories.json"),
  );
  assert.equal(catalog.repositories.some(
    (item) => item.repository.toLowerCase() === "ambicuity/new-grad-jobs",
  ), false, "repository maintenance issues must not be published as vacancies");
});

test("discovery retains the rejection of the maintenance-only job-list repository", async () => {
  const registry = await readDiscoveryDecisions(
    resolve(process.cwd(), "src/modules/discovery/discovery-decisions.json"),
  );
  const decision = registry.decisions.find(
    (item) => item.repository.toLowerCase() === "ambicuity/new-grad-jobs",
  );
  assert.equal(decision?.decision, "rejected");
  assert.ok(activeDecisionKeys(registry.decisions, "2099-01-01")
    .has("ambicuity/new-grad-jobs"), "discovery must not propose this source again without review");
});

test("pending publications do not republish rejected issue sources", async () => {
  const registry = await readDiscoveryDecisions(
    resolve(process.cwd(), "src/modules/discovery/discovery-decisions.json"),
  );
  const rejected = new Set(registry.decisions
    .filter((item) => item.decision === "rejected")
    .map((item) => item.repository.toLowerCase()));
  const outbox = JSON.parse(await readFile(
    resolve(process.cwd(), "snapshots/publishing/outbox.json"), "utf8",
  ));
  for (const publication of outbox.publications) {
    for (const delivery of publication.deliveries) {
      const repository = delivery.payload?.entity?.content?.repository;
      assert.ok(!rejected.has(repository?.toLowerCase()),
        `pending publication still includes rejected source: ${repository}`);
    }
  }
});

const EXPECTED = {
  "OurTinTinLand/TinTin-Job-Board": {
    country: "China",
    countryCode: "CN",
    region: "Asia",
    locale: "zh-CN",
    scope: "national",
  },
  "Prime-Leo-Enterprises/Jobs": {
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
    locale: "en",
    scope: "global",
  },
};

test("catalog includes the TinTin and Prime Leo label-free sources", async () => {
  const catalog = await readRepositoryCatalog(
    resolve(process.cwd(), "src/modules/catalog/repositories.json"),
  );

  for (const [repository, expected] of Object.entries(EXPECTED)) {
    const entry = catalog.repositories.find(
      (item) => item.repository === repository,
    );
    assert.ok(entry, `${repository} must be cataloged`);
    assert.deepEqual(
      Object.fromEntries(
        Object.keys(expected).map((key) => [key, entry[key]]),
      ),
      expected,
    );
    assert.equal(entry.requiredLabels, undefined);
  }

  const primeLeoRepository = catalog.repositories.find(
    (item) => item.repository === "Prime-Leo-Enterprises/Jobs",
  );
  const tintinRepository = catalog.repositories.find(
    (item) => item.repository === "OurTinTinLand/TinTin-Job-Board",
  );
  assert.ok(primeLeoRepository);
  assert.ok(tintinRepository);

  const primeLeo = mapIssueToOpportunity(
    {
      id: 1,
      number: 1,
      title:
        "Hiring a Fractional CTO for Next-Gen Supply Chain Platform in Africa",
      body: "Location: Remote — Nigeria preferred",
      state: "open",
      html_url: "https://github.com/Prime-Leo-Enterprises/Jobs/issues/1",
      created_at: "2026-03-31T00:00:00.000Z",
      updated_at: "2026-03-31T00:00:00.000Z",
      labels: [],
      user: { login: "Prime-Leo-Enterprises", avatar_url: "" },
    },
    primeLeoRepository,
  );
  assert.equal(primeLeo.issueState, "open");
  assert.equal(primeLeo.repository, "Prime-Leo-Enterprises/Jobs");

  const tintin = mapIssueToOpportunity(
    {
      id: 2,
      number: 87,
      title: "Senior Web3 Engineer",
      body: "Location: China\nRemote role in a blockchain team.",
      state: "open",
      html_url:
        "https://github.com/OurTinTinLand/TinTin-Job-Board/issues/87",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      labels: [],
      user: { login: "OurTinTinLand", avatar_url: "" },
    },
    tintinRepository,
  );
  assert.equal(tintin.issueState, "open");
  assert.equal(tintin.repository, "OurTinTinLand/TinTin-Job-Board");
});
