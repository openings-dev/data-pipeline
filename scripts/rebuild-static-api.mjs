import { readFile, readdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { readRepositoryCatalog } from "../src/modules/catalog/catalog-repository.mjs";
import { buildStaticApiFiles } from "../src/modules/snapshot/static-api/build-static-api-files.mjs";
import { staticApiStatusPath } from "../src/modules/snapshot/static-api/paths.mjs";
import { readJsonIfExists } from "../src/modules/storage/read-json-if-exists.mjs";
import { writeJsonIfChanged } from "../src/modules/storage/write-json-if-changed.mjs";

const rootDir = resolve(process.cwd(), "snapshots/opportunities");

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(rootDir, relativePath), "utf8"));
}

async function readCountrySnapshot(country) {
  const index = await readJson(country.indexFile);
  const repositoryShards = await Promise.all(index.byRepository.map(async (repository) => ({
    relativePath: repository.file,
    payload: await readJson(repository.file),
  })));
  return { countryCode: country.countryCode, repositoryShards };
}

async function pruneGeneratedDirectory(relativeDir, liveFiles) {
  const entries = await readdir(resolve(rootDir, relativeDir), { withFileTypes: true });
  await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map(async (entry) => {
      const relativePath = `${relativeDir}/${entry.name}`;
      if (!liveFiles.has(relativePath)) await unlink(resolve(rootDir, relativePath));
    }));
}

async function main() {
  const [globalIndex, catalog, previousStatus] = await Promise.all([
    readJson("index.json"),
    readRepositoryCatalog(resolve(process.cwd(), "src/modules/catalog/repositories.json")),
    readJsonIfExists(resolve(rootDir, staticApiStatusPath())),
  ]);
  const countrySnapshots = await Promise.all(globalIndex.countries.map(readCountrySnapshot));
  const files = buildStaticApiFiles({
    snapshotRootDir: rootDir,
    generatedAt: globalIndex.generatedAt,
    countrySnapshots,
    repositories: catalog.repositories,
    failedRepositories: globalIndex.failedRepositories ?? [],
    previousStatus,
  });
  for (const file of files) await writeJsonIfChanged(file.filePath, file.payload);
  const liveFiles = new Set(files.map((file) => file.relativePath));
  await Promise.all(["api/jobs", "api/pages"].map((directory) =>
    pruneGeneratedDirectory(directory, liveFiles)
  ));
  const nextIndex = {
    ...globalIndex,
    staticApi: {
      manifestFile: "api/manifest.json",
      files: files.map((file) => file.relativePath).sort(),
    },
  };
  await writeJsonIfChanged(resolve(rootDir, "index.json"), nextIndex);
  console.log(`static-api-rebuilt: ${files.length} files`);
}

await main();
