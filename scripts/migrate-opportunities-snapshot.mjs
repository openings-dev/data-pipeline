import { access, readFile, rm } from "node:fs/promises";
import { loadBuildConfig } from "../src/config/env.mjs";
import { readRepositoryCatalog } from "../src/modules/catalog/catalog-repository.mjs";
import { prepareSegmentedSnapshot } from "../src/modules/snapshot/prepare-segmented-snapshot.mjs";
import { writeSegmentedSnapshot } from "../src/modules/snapshot/write-segmented-snapshot.mjs";
import { convertLegacySnapshot } from "../src/modules/snapshot/convert-legacy-snapshot.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const config = loadBuildConfig();

  if (!(await exists(config.paths.legacySnapshotFile))) {
    console.log("migrate-skip: legacy snapshot not found");
    return;
  }

  const legacyContent = await readFile(config.paths.legacySnapshotFile, "utf8");
  const legacySnapshot = JSON.parse(legacyContent);
  const catalog = await readRepositoryCatalog(config.paths.repositoriesFile);
  const countries = convertLegacySnapshot({ legacySnapshot, catalogRepositories: catalog.repositories });

  const prepared = prepareSegmentedSnapshot({
    snapshotRootDir: config.paths.snapshotRootDir,
    generatedAt: legacySnapshot.generatedAt ?? new Date().toISOString(),
    catalogGeneratedAt: legacySnapshot.catalogGeneratedAt ?? catalog.generatedAt ?? null,
    request: legacySnapshot.request ?? {},
    repositoriesRequested: legacySnapshot.repositoriesRequested ?? catalog.repositories.length,
    repositoriesScanned: legacySnapshot.repositoriesScanned ?? 0,
    failedRepositories: legacySnapshot.failedRepositories ?? [],
    countries,
    catalogRepositories: catalog.repositories,
  });

  const result = await writeSegmentedSnapshot(prepared);
  await rm(config.paths.legacySnapshotFile, { force: true });
  console.log(`migrate-ok: changed ${result.changedFiles.length} files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
