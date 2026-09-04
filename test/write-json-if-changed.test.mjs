import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { writeSegmentedSnapshot } from "../src/modules/snapshot/write-segmented-snapshot.mjs";
import { writeJsonIfChanged } from "../src/modules/storage/write-json-if-changed.mjs";

async function withTempDir(callback) {
  const directory = await mkdtemp(join(tmpdir(), "openings-data-pipeline-"));

  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("writeJsonIfChanged does not rewrite when only ignored fields changed", async () => {
  await withTempDir(async (directory) => {
    const filePath = join(directory, "snapshot.json");
    const currentContent = `${JSON.stringify({
      generatedAt: "2026-04-29T10:49:31.510Z",
      dataHash: "same",
      items: [{ id: "job-1" }],
    }, null, 2)}\n`;
    await writeFile(filePath, currentContent, "utf8");

    const changed = await writeJsonIfChanged(
      filePath,
      {
        generatedAt: "2026-04-29T13:29:01.811Z",
        dataHash: "same",
        items: [{ id: "job-1" }],
      },
      { ignoredComparisonFields: ["generatedAt"] },
    );

    assert.equal(changed, false);
    assert.equal(await readFile(filePath, "utf8"), currentContent);
  });
});

test("writeJsonIfChanged rewrites when non-ignored fields changed", async () => {
  await withTempDir(async (directory) => {
    const filePath = join(directory, "snapshot.json");
    await writeJson(filePath, {
      generatedAt: "2026-04-29T10:49:31.510Z",
      dataHash: "old",
      items: [{ id: "job-1" }],
    });

    const nextValue = {
      generatedAt: "2026-04-29T13:29:01.811Z",
      dataHash: "new",
      items: [{ id: "job-1" }],
    };

    const changed = await writeJsonIfChanged(
      filePath,
      nextValue,
      { ignoredComparisonFields: ["generatedAt"] },
    );

    assert.equal(changed, true);
    assert.equal(await readFile(filePath, "utf8"), `${JSON.stringify(nextValue, null, 2)}\n`);
  });
});

test("writeSegmentedSnapshot ignores generatedAt-only snapshot changes", async () => {
  await withTempDir(async (snapshotRootDir) => {
    const repositoryRelativePath = "countries/br/repositories/example-jobs.json";
    const countryIndexRelativePath = "countries/br/index.json";
    const globalIndexPath = join(snapshotRootDir, "index.json");
    const countryIndexPath = join(snapshotRootDir, countryIndexRelativePath);
    const repositoryPath = join(snapshotRootDir, repositoryRelativePath);

    const oldGeneratedAt = "2026-04-29T10:49:31.510Z";
    const newGeneratedAt = "2026-04-29T13:29:01.811Z";

    const repositoryPayload = {
      generatedAt: oldGeneratedAt,
      country: "Brazil",
      countryCode: "BR",
      region: "Americas",
      repository: "example/jobs",
      totals: { opportunities: 1, openIssues: 1, closedIssues: 0 },
      dataHash: "repo-hash",
      items: [{ id: "job-1" }],
    };
    const countryIndexPayload = {
      generatedAt: oldGeneratedAt,
      country: "Brazil",
      countryCode: "BR",
      region: "Americas",
      totals: { opportunities: 1, repositories: 1, openIssues: 1, closedIssues: 0 },
      failedRepositories: [],
      byRepository: [{
        repository: "example/jobs",
        issues: 1,
        openIssues: 1,
        closedIssues: 0,
        file: repositoryRelativePath,
        hash: "repo-hash",
      }],
    };
    const globalIndexPayload = {
      generatedAt: oldGeneratedAt,
      schemaVersion: 2,
      dataHash: "global-hash",
      catalogGeneratedAt: "2026-04-24",
      request: {},
      repositoriesRequested: 1,
      repositoriesScanned: 1,
      totals: {
        opportunities: 1,
        uniqueRepositories: 1,
        uniqueCountries: 1,
        uniqueRegions: 1,
        failedRepositories: 0,
      },
      failedRepositories: [],
      staticApi: { manifestFile: "api/manifest.json", files: [] },
      countries: [{
        country: "Brazil",
        countryCode: "BR",
        region: "Americas",
        opportunities: 1,
        repositories: 1,
        openIssues: 1,
        closedIssues: 0,
        indexFile: countryIndexRelativePath,
      }],
    };

    await writeJson(repositoryPath, repositoryPayload);
    await writeJson(countryIndexPath, countryIndexPayload);
    await writeJson(globalIndexPath, globalIndexPayload);

    const result = await writeSegmentedSnapshot({
      snapshotRootDir,
      globalIndex: {
        relativePath: "index.json",
        filePath: globalIndexPath,
        payload: { ...globalIndexPayload, generatedAt: newGeneratedAt },
      },
      countrySnapshots: [{
        index: {
          relativePath: countryIndexRelativePath,
          filePath: countryIndexPath,
          payload: { ...countryIndexPayload, generatedAt: newGeneratedAt },
        },
        repositoryShards: [{
          relativePath: repositoryRelativePath,
          filePath: repositoryPath,
          payload: { ...repositoryPayload, generatedAt: newGeneratedAt },
        }],
      }],
    });

    const globalIndexContent = await readFile(globalIndexPath, "utf8");
    const countryIndexContent = await readFile(countryIndexPath, "utf8");
    const repositoryContent = await readFile(repositoryPath, "utf8");

    assert.deepEqual(result, { updated: false, changedFiles: [] });
    assert.equal(globalIndexContent, `${JSON.stringify(globalIndexPayload, null, 2)}\n`);
    assert.equal(countryIndexContent, `${JSON.stringify(countryIndexPayload, null, 2)}\n`);
    assert.equal(repositoryContent, `${JSON.stringify(repositoryPayload, null, 2)}\n`);
  });
});

test("writeSegmentedSnapshot removes retired author artifacts", async () => {
  await withTempDir(async (snapshotRootDir) => {
    const retiredRelativePath = "api/authors/retired.json";
    const retiredPath = join(snapshotRootDir, retiredRelativePath);
    const globalIndexPath = join(snapshotRootDir, "index.json");
    await writeJson(retiredPath, { schemaVersion: 1, author: { handle: "retired" } });
    await writeJson(globalIndexPath, {
      schemaVersion: 2,
      countries: [],
      staticApi: { manifestFile: "api/manifest.json", files: [retiredRelativePath] },
    });

    const nextGlobalIndex = {
      schemaVersion: 2,
      countries: [],
      staticApi: { manifestFile: "api/manifest.json", files: [] },
    };
    const result = await writeSegmentedSnapshot({
      snapshotRootDir,
      globalIndex: {
        relativePath: "index.json",
        filePath: globalIndexPath,
        payload: nextGlobalIndex,
      },
      countrySnapshots: [],
      staticApiFiles: [],
    });

    assert.equal(result.changedFiles.includes(retiredRelativePath), true);
    await assert.rejects(readFile(retiredPath, "utf8"), { code: "ENOENT" });
  });
});
