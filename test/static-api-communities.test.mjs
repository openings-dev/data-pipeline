import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { buildCommunities } from "../src/modules/snapshot/static-api/communities.mjs";
import { buildStaticApiFiles } from "../src/modules/snapshot/static-api/build-static-api-files.mjs";

const repositories = [
  {
    repository: "zero/jobs",
    owner: "zero",
    name: "jobs",
    url: "https://github.com/zero/jobs",
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
    locale: "en",
    scope: "global",
  },
  {
    repository: "active/jobs",
    owner: "active",
    name: "jobs",
    url: "https://github.com/active/jobs",
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    locale: "pt-BR",
    scope: "national",
  },
  {
    repository: "closed/jobs",
    owner: "closed",
    name: "jobs",
    url: "https://github.com/closed/jobs",
    country: "Mexico",
    countryCode: "MX",
    region: "North America",
    locale: "es-MX",
    scope: "national",
  },
];

const items = [
  {
    repository: "closed/jobs",
    issueState: "closed",
    createdAt: "2026-01-01T00:00:00.000Z",
    community: { name: "Closed Jobs", avatarUrl: "https://example.com/closed.png" },
  },
  {
    repository: "active/jobs",
    issueState: "open",
    createdAt: "2026-02-01T00:00:00.000Z",
    community: { name: "Active Jobs", avatarUrl: "https://example.com/active.png" },
  },
  {
    repository: "active/jobs",
    issueState: "open",
    createdAt: "2026-03-01T00:00:00.000Z",
    community: { name: "Active Jobs", avatarUrl: "https://example.com/active.png" },
  },
];

test("buildCommunities includes inactive catalog sources and open opportunity metadata", () => {
  assert.deepEqual(buildCommunities(repositories, items), {
    items: [
      {
        repository: "active/jobs",
        repositoryUrl: "https://github.com/active/jobs",
        name: "Active Jobs",
        avatarUrl: "https://example.com/active.png",
        region: "South America",
        country: "Brazil",
        countryCode: "BR",
        locale: "pt-BR",
        scope: "national",
        opportunitiesCount: 2,
        lastPostedAt: "2026-03-01T00:00:00.000Z",
      },
      {
        repository: "closed/jobs",
        repositoryUrl: "https://github.com/closed/jobs",
        name: "closed",
        avatarUrl: "https://github.com/closed.png",
        region: "North America",
        country: "Mexico",
        countryCode: "MX",
        locale: "es-MX",
        scope: "national",
        opportunitiesCount: 0,
        lastPostedAt: null,
      },
      {
        repository: "zero/jobs",
        repositoryUrl: "https://github.com/zero/jobs",
        name: "zero",
        avatarUrl: "https://github.com/zero.png",
        region: "Global",
        country: "Global",
        countryCode: "GLOBAL",
        locale: "en",
        scope: "global",
        opportunitiesCount: 0,
        lastPostedAt: null,
      },
    ],
  });
});

test("static API manifest versions and hashes the communities artifact", () => {
  const build = (catalogRepositories) => buildStaticApiFiles({
    snapshotRootDir: "/tmp/openings-static-api-test",
    generatedAt: "2026-08-19T00:00:00.000Z",
    countrySnapshots: [],
    repositories: catalogRepositories,
  });
  const firstFiles = build([repositories[0]]);
  const secondFiles = build([{ ...repositories[0], owner: "changed" }]);
  const firstManifest = firstFiles.find(({ relativePath }) => relativePath === "api/manifest.json").payload;
  const secondManifest = secondFiles.find(({ relativePath }) => relativePath === "api/manifest.json").payload;

  assert.equal(firstManifest.schemaVersion, 6);
  assert.equal(firstManifest.files.communities, "api/communities.json");
  assert.equal(firstManifest.totals.communities, 1);
  assert.notEqual(firstManifest.dataHash, secondManifest.dataHash);
});

test("catalog contains vetted issue-backed communities", async () => {
  const catalog = JSON.parse(await readFile(
    new URL("../src/modules/catalog/repositories.json", import.meta.url),
    "utf8",
  ));
  const repositories = new Set(catalog.repositories.map((entry) => entry.repository));
  const expected = [
    "awesome-jobs/jobs",
    "CangaceirosDevels/vagas",
    "CodeandoMexico/jobs",
    "eduardoborges/vagas-ti-sergipe",
    "felipenoka/vagas",
    "Infrasity-Labs/developer-marketing-jobs",
    "stone-pagamentos/vagas",
  ];

  for (const repository of expected) {
    assert.equal(repositories.has(repository), true, `missing ${repository}`);
  }
});
