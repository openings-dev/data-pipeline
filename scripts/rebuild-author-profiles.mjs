import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildAuthorArtifacts } from "../src/modules/snapshot/static-api/authors.mjs";
import { writeJsonIfChanged } from "../src/modules/storage/write-json-if-changed.mjs";

const root = resolve(process.cwd(), "snapshots/opportunities");

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

const manifest = await readJson("api/manifest.json");
const index = await readJson("index.json");
const pages = await Promise.all(
  manifest.pages.map(({ file }) => readJson(file)),
);
const artifacts = buildAuthorArtifacts(
  pages.flatMap((page) => page.items),
  manifest.generatedAt,
);

for (const artifact of artifacts) {
  await writeJsonIfChanged(resolve(root, artifact.file), artifact.payload);
}

manifest.totals.authors = artifacts.length;
manifest.totals.authorArtifactBytes = artifacts.reduce(
  (total, artifact) => total + artifact.bytes,
  0,
);
await writeJsonIfChanged(resolve(root, "api/manifest.json"), manifest);

const authorFiles = new Set(artifacts.map(({ file }) => file));
index.staticApi.files = [
  ...index.staticApi.files.filter((file) => !file.startsWith("api/authors/")),
  ...authorFiles,
].sort();
await writeJsonIfChanged(resolve(root, "index.json"), index);

console.log(
  `author-profiles-rebuilt: ${artifacts.length} files, ${manifest.totals.authorArtifactBytes} bytes`,
);
