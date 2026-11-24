import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { readRepositoryCatalog } from '../src/modules/catalog/catalog-repository.mjs';
import { buildStaticApiFiles } from '../src/modules/snapshot/static-api/build-static-api-files.mjs';

test('production catalog admits only the sixteen documented reuse sources', async () => {
 const catalog = await readRepositoryCatalog('src/modules/catalog/repositories.json');
 assert.equal(catalog.repositories.length, 16);
 assert.ok(catalog.repositories.every(x => x.contentLicense?.notice.includes('Permission is hereby granted')));
});

test('static rebuild excludes unapproved shards before canonical selection and keeps notices', async () => {
 const catalog = await readRepositoryCatalog('src/modules/catalog/repositories.json');
 const shard = JSON.parse(await readFile('snapshots/opportunities/countries/br/repositories/backend-br-vagas.json','utf8'));
 const files = buildStaticApiFiles({ snapshotRootDir:'/tmp/not-written',generatedAt:shard.generatedAt,
  repositories:catalog.repositories.filter(x=>x.repository==='backend-br/vagas'),
  countrySnapshots:[{repositoryShards:[{payload:shard},{payload:{...shard,repository:'unreviewed/jobs',items:shard.items.map(x=>({...x,repository:'unreviewed/jobs',id:`bad-${x.id}`,description:'UNREVIEWED CONTENT',createdAt:'2000-01-01T00:00:00Z'}))}}]}] });
 const jobs=files.filter(x=>x.relativePath.startsWith('api/jobs/')).flatMap(x=>Object.values(x.payload.items));
 assert.ok(jobs.length>0);
 assert.ok(jobs.every(x=>x.repository==='backend-br/vagas' && x.description!=='UNREVIEWED CONTENT'));
 assert.ok(jobs.every(x=>x.contentLicenses.some(l=>l.repository==='backend-br/vagas' && l.notice.includes('Permission is hereby granted'))));
});

test('adding an undocumented source to catalog input cannot activate it', async () => {
 const { documentedSources } = await import('../src/modules/catalog/source-rights.mjs');
 assert.deepEqual(documentedSources([{repository:'unreviewed/jobs'}]), []);
 assert.equal(documentedSources([{repository:'BACKEND-BR/VAGAS'}]).length,1);
});

test('production discovery review cannot approve a source without rights evidence', async () => {
 const { applyCommunityReviews } = await import('../src/modules/discovery/apply-community-reviews.mjs');
 assert.throws(() => applyCommunityReviews({report:{status:'complete',candidates:[{repository:'unreviewed/jobs'}]},
 reviews:{decisions:[{repository:'unreviewed/jobs',decision:'approved'}]},
 catalog:{contentRightsPolicy:'documented-reuse',repositories:[]}, decisions:{decisions:[]}}), /reuse evidence/);
});

test('published source shards, details and pending jobs contain only documented sources', async () => {
 const catalog = await readRepositoryCatalog('src/modules/catalog/repositories.json');
 const allowed = new Set(catalog.repositories.map(x => x.repository));
 const read = async path => JSON.parse(await readFile(`snapshots/opportunities/${path}`, 'utf8'));
 const index = await read('index.json');
 for (const country of index.countries) {
  for (const shard of (await read(country.indexFile)).byRepository) {
   assert.ok(allowed.has(shard.repository));
   for (const item of (await read(shard.file)).items) assert.ok(item.contentLicenses?.length);
  }
 }
 const manifest = await read('api/manifest.json');
 assert.equal((await read(manifest.files.sourceLicenses)).sources.length, 16);
 for (const page of manifest.pages) {
  for (const job of (await read(page.file)).items) {
   assert.ok(allowed.has(job.repository));
   assert.ok(job.sources.every(source => allowed.has(source.repository)));
   assert.ok(job.sources.every(source => job.contentLicenses.some(license => license.repository === source.repository)));
  }
 }
 const outbox = JSON.parse(await readFile('snapshots/publishing/outbox.json','utf8'));
 for (const publication of outbox.publications.filter(x => x.identity.sourceType === 'job')) {
  const job = publication.deliveries[0].payload.entity.content;
  assert.ok(allowed.has(job.repository));
  assert.ok(job.sources.every(source => allowed.has(source.repository)));
  assert.ok(job.contentLicenses.every(license => allowed.has(license.repository)));
 }
});

test('a license notice change changes the manifest hash for consumer refresh', async () => {
 const catalog = await readRepositoryCatalog('src/modules/catalog/repositories.json');
 const shard = JSON.parse(await readFile('snapshots/opportunities/countries/br/repositories/backend-br-vagas.json','utf8'));
 const source = catalog.repositories.find(x => x.repository === shard.repository);
 const hash = repository => buildStaticApiFiles({snapshotRootDir:'/tmp/not-written',generatedAt:shard.generatedAt,
  repositories:[repository],countrySnapshots:[{repositoryShards:[{payload:shard}]}]})
  .find(file => file.relativePath === 'api/manifest.json').payload.dataHash;
 assert.notEqual(hash(source), hash({...source,contentLicense:{...source.contentLicense,notice:source.contentLicense.notice+'\nUpdated notice'}}));
});

test('offline static rebuild preserves prior run history and prunes obsolete authors', async () => {
 const { mkdtemp, cp, mkdir, rm, writeFile, access } = await import('node:fs/promises');
 const { tmpdir } = await import('node:os');
 const { resolve } = await import('node:path');
 const { promisify } = await import('node:util');
 const { execFile } = await import('node:child_process');
 const root = await mkdtemp(resolve(tmpdir(), 'openings-rights-test-'));
 try {
  await cp('snapshots/opportunities', `${root}/snapshots/opportunities`, {recursive:true});
  await mkdir(`${root}/src/modules/catalog`, {recursive:true});
  await cp('src/modules/catalog/repositories.json', `${root}/src/modules/catalog/repositories.json`);
  const path = `${root}/snapshots/opportunities/api/status-history.json`;
  const history = JSON.parse(await readFile(path,'utf8'));
  const earlier = {...history.runs[0],completedAt:new Date(Date.parse(history.runs[0].completedAt)-1000).toISOString()};
  history.runs.push(earlier);
  await writeFile(path,JSON.stringify(history));
  const obsolete = `${root}/snapshots/opportunities/api/authors/obsolete-unreviewed.json`;
  await writeFile(obsolete,'{}');
  await promisify(execFile)(process.execPath,[resolve('scripts/rebuild-static-api.mjs')],{cwd:root});
  assert.ok(JSON.parse(await readFile(path,'utf8')).runs.some(run=>run.completedAt===earlier.completedAt));
  await assert.rejects(access(obsolete));
 } finally { await rm(root,{recursive:true,force:true}); }
});
