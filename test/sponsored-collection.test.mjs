import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { processRepository } from "../src/modules/build/process-repository.mjs";
import { readRepositoryCatalog } from "../src/modules/catalog/catalog-repository.mjs";
import { createGitHubClient } from "../src/modules/github/github-client.mjs";

const sponsoredRepository = {
  repository: "openings-dev/jobs",
  owner: "openings-dev",
  name: "jobs",
  url: "https://github.com/openings-dev/jobs",
  country: "Global",
  countryCode: "GLOBAL",
  region: "Global",
  requiredLabels: ["sponsored"],
  promotionType: "sponsored",
};

function createIssue(number, labels) {
  return {
    id: number,
    number,
    title: `Role ${number}`,
    body: "Role description",
    state: "open",
    html_url: `https://github.com/openings-dev/jobs/issues/${number}`,
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    labels: labels.map((name) => ({ name })),
    user: {
      login: "employer",
      avatar_url: "https://github.com/employer.png",
    },
  };
}

test("GitHub collection sends every required label to the issues API", async (context) => {
  let requestedUrl = "";
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const logger = { info() {}, warn() {} };
  const githubClient = createGitHubClient({
    token: "",
    maxIssuesPerRepository: 30,
    logger,
  });

  await githubClient.fetchRecentIssues("openings-dev/jobs", [
    "sponsored",
    "approved",
  ]);

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get("labels"), "sponsored,approved");
});

test("repository processing maps only issues with every required label", async () => {
  const approvedIssue = createIssue(1, ["sponsored", "approved"]);
  const requestIssue = createIssue(2, ["ad-request"]);
  const githubClient = {
    async fetchRecentIssues(repository, labels) {
      assert.equal(repository, "openings-dev/jobs");
      assert.deepEqual(labels, ["sponsored", "approved"]);
      return [approvedIssue, requestIssue];
    },
  };

  const result = await processRepository({
    repository: {
      ...sponsoredRepository,
      requiredLabels: ["sponsored", "approved"],
    },
    githubClient,
  });

  assert.deepEqual(
    result.items.map((item) => item.sourceId),
    ["openings-dev/jobs#1"],
  );
});

test("catalog validation rejects malformed required labels", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "openings-catalog-"));
  const catalogPath = path.join(directory, "repositories.json");
  await writeFile(catalogPath, JSON.stringify({
    repositories: [{ ...sponsoredRepository, requiredLabels: "sponsored" }],
  }));

  try {
    await assert.rejects(
      readRepositoryCatalog(catalogPath),
      /requiredLabels must be an array of non-empty strings/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
