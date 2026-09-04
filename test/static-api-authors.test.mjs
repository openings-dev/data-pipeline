import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTHOR_ARTIFACT_MAX_BYTES,
  buildAuthorArtifacts,
} from "../src/modules/snapshot/static-api/authors.mjs";

function opportunity(overrides = {}) {
  return {
    id: "gh_a",
    issueState: "open",
    country: "Brazil",
    region: "South America",
    createdAt: "2026-09-01T00:00:00.000Z",
    author: {
      handle: "@Alice",
      name: "Alice Example",
      avatarUrl: "https://avatars.example/alice.png",
    },
    ...overrides,
  };
}

test("builds one compact profile artifact per active author", () => {
  const artifacts = buildAuthorArtifacts([
    opportunity(),
    opportunity({
      id: "gh_b",
      country: "Portugal",
      region: "Europe",
      createdAt: "2026-09-03T00:00:00.000Z",
    }),
    opportunity({
      id: "gh_c",
      country: "Brazil",
      createdAt: "2026-08-20T00:00:00.000Z",
    }),
    opportunity({
      id: "gh_closed",
      issueState: "closed",
      createdAt: "2026-09-04T00:00:00.000Z",
    }),
  ], "2026-09-04T20:10:00.000Z");

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].file, "api/authors/Alice.json");
  assert.equal(artifacts[0].bytes <= AUTHOR_ARTIFACT_MAX_BYTES, true);
  assert.deepEqual(artifacts[0].payload, {
    schemaVersion: 1,
    generatedAt: "2026-09-04T20:10:00.000Z",
    author: {
      handle: "Alice",
      name: "Alice Example",
      avatarUrl: "https://avatars.example/alice.png",
      region: "South America",
      country: "Brazil",
      opportunitiesCount: 3,
      lastPostedAt: "2026-09-03T00:00:00.000Z",
    },
  });
});

test("encodes author handles and sorts artifacts deterministically", () => {
  const artifacts = buildAuthorArtifacts([
    opportunity({ id: "gh_z", author: { handle: "zoe/name", name: "Zoe", avatarUrl: "" } }),
    opportunity({ id: "gh_a", author: { handle: "alice", name: "Alice", avatarUrl: "" } }),
  ], "2026-09-04T20:10:00.000Z");

  assert.deepEqual(artifacts.map(({ file }) => file), [
    "api/authors/alice.json",
    "api/authors/zoe%2Fname.json",
  ]);
});

test("rejects an author artifact above the size limit", () => {
  assert.throws(
    () => buildAuthorArtifacts([
      opportunity({ author: { handle: "large", name: "x".repeat(AUTHOR_ARTIFACT_MAX_BYTES), avatarUrl: "" } }),
    ], "2026-09-04T20:10:00.000Z"),
    /exceeds 32768 bytes/u,
  );
});
