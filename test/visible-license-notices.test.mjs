import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { readRepositoryCatalog } from '../src/modules/catalog/catalog-repository.mjs';
import { buildStaticApiFiles } from '../src/modules/snapshot/static-api/build-static-api-files.mjs';

test('public descriptions end with complete attributed notices for every deduplicated source', async () => {
 const catalog=await readRepositoryCatalog('src/modules/catalog/repositories.json');
 const repositories=catalog.repositories.filter(x=>['backend-br/vagas','frontendbr/vagas'].includes(x.repository));
 const shard=JSON.parse(await readFile('snapshots/opportunities/countries/br/repositories/backend-br-vagas.json','utf8'));
 const original=shard.items.find(item=>item.issueState==='open');
 const items=repositories.map((source,index)=>({...original,id:`${source.repository}#1`,sourceId:`${source.repository}#1`,repository:source.repository,url:`${source.url}/issues/1`,createdAt:`2026-11-0${index+1}T00:00:00Z`}));
 const before=structuredClone(items);
 const files=buildStaticApiFiles({snapshotRootDir:'/tmp/not-written',generatedAt:shard.generatedAt,repositories,countrySnapshots:[{repositoryShards:[{payload:{items}}]}]});
 const jobs=files.filter(x=>x.relativePath.startsWith('api/jobs/')).flatMap(x=>Object.values(x.payload.items));
 assert.equal(jobs.length,1);
 const job=jobs[0];
 assert.ok(job.description.startsWith(original.description+'\n\nSource and license notices\n'));
 for(const license of job.contentLicenses) {
  assert.ok(job.description.includes(license.notice.trim()));
  assert.ok(job.description.includes(license.repository));
  assert.ok(job.description.includes(license.licenseUrl));
 }
 assert.equal(job.excerpt,original.excerpt);
 assert.deepEqual(items,before);
 const page=files.find(x=>x.relativePath==='api/pages/page-0001.json').payload.items[0];
 assert.equal(page.description,job.description);
 assert.ok(!JSON.stringify(files.find(x=>x.relativePath==='api/search-index.json').payload).includes('Permission is hereby granted'));
});

test('notice rendering is idempotent and preserves original excerpt and metadata', async () => {
 const { withSourceLicenseNotices }=await import('../src/modules/snapshot/static-api/source-license-notices.mjs');
 const catalog=await readRepositoryCatalog('src/modules/catalog/repositories.json');
 const license=catalog.repositories[0].contentLicense;
 const input={description:'Original vacancy text.\n',excerpt:'Original card summary',id:'unchanged',contentLicenses:[license,license],sources:[{repository:license.repository,url:'https://github.com/example/jobs/issues/1'}]};
 const once=withSourceLicenseNotices(input);
 assert.deepEqual(withSourceLicenseNotices(once),once);
 assert.equal(once.description.split('Source and license notices').length,2);
 assert.equal(once.description.split(license.notice.trim()).length,2);
 assert.equal(once.id,input.id);
 assert.equal(once.excerpt,input.excerpt);
 assert.equal(input.description,'Original vacancy text.\n');
 assert.equal(withSourceLicenseNotices({description:'No licensed content'}).description,'No licensed content');
});
