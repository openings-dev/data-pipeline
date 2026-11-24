import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readRepositoryCatalog } from '../src/modules/catalog/catalog-repository.mjs';
import { prepareSegmentedSnapshot } from '../src/modules/snapshot/prepare-segmented-snapshot.mjs';
import { writeSegmentedSnapshot } from '../src/modules/snapshot/write-segmented-snapshot.mjs';
import { writeJsonIfChanged } from '../src/modules/storage/write-json-if-changed.mjs';
import { buildNewJobPublications } from '../src/modules/publishing/job-publications.mjs';

// Reprocess existing source shards without fetching or publishing externally.
const root = resolve('snapshots/opportunities');
const read = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const catalog = await readRepositoryCatalog(resolve('src/modules/catalog/repositories.json'));
const allowed = new Set(catalog.repositories.map(source => source.repository));
const index = await read('index.json');
const countries = [];
for (const entry of index.countries) {
  const country = await read(entry.indexFile);
  const repositories = [];
  for (const source of country.byRepository) {
    if (!allowed.has(source.repository)) continue;
    const shard = await read(source.file);
    repositories.push({ repository: source.repository, items: shard.items,
      issues: shard.items.length, openIssues: shard.items.filter(item => item.issueState === 'open').length,
      closedIssues: shard.items.filter(item => item.issueState === 'closed').length });
  }
  if (repositories.length) countries.push({ ...country, repositories,
    failedRepositories: (country.failedRepositories ?? []).filter(source => allowed.has(source.repository)) });
}
const snapshot = prepareSegmentedSnapshot({ snapshotRootDir: root,
  generatedAt: new Date().toISOString(), catalogGeneratedAt: catalog.generatedAt,
  request: { ...index.request, contentRightsPolicy: catalog.contentRightsPolicy },
  repositoriesRequested: allowed.size,
  repositoriesScanned: countries.reduce((total, country) => total + country.repositories.length, 0),
  failedRepositories: (index.failedRepositories ?? []).filter(source => allowed.has(source.repository)),
  countries, catalogRepositories: catalog.repositories,
  previousStatus: await read('api/status.json'), previousStatusHistory: await read('api/status-history.json') });
const result = await writeSegmentedSnapshot(snapshot);
const jobs = snapshot.staticApiFiles.filter(file => file.relativePath.startsWith('api/jobs/'))
  .flatMap(file => Object.values(file.payload.items));
const current = new Map(buildNewJobPublications({ previousIds: [], jobs })
  .map(publication => [`${publication.identity.sourceType}:${publication.identity.sourceId}`, publication]));
const outboxPath = resolve('snapshots/publishing/outbox.json');
const outbox = JSON.parse(await readFile(outboxPath, 'utf8'));
let removed = 0, refreshed = 0;
const publications = outbox.publications.flatMap(publication => {
  const key = `${publication.identity.sourceType}:${publication.identity.sourceId}`;
  const next = current.get(key);
  if (!['job', 'author', 'community'].includes(publication.identity.sourceType)) return [publication];
  if (!next) { removed++; return []; }
  if (JSON.stringify(publication) !== JSON.stringify(next)) refreshed++;
  return [next];
});
await writeJsonIfChanged(outboxPath, { ...outbox, publications });
console.log(JSON.stringify({ sources: allowed.size, jobs: jobs.length,
  changedFiles: result.changedFiles.length, pendingRemoved: removed, pendingRefreshed: refreshed,
  pendingRetained: publications.length }));
