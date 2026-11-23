import assert from 'node:assert/strict';
import test from 'node:test';
import { processRepository } from '../src/modules/build/process-repository.mjs';

const base = { repository: 'example/jobs', owner: 'example', url: 'https://github.com/example/jobs', country: 'United States', countryCode: 'US', region: 'North America' };
const issue = (number, title, body, labels = []) => ({ number, id: number, title, body, labels, state: 'open', html_url: `https://github.com/example/jobs/issues/${number}`, created_at: '2026-11-23T00:00:00Z' });
const form = '### Company Name\n\nExample\n\n### Internship Title\n\nSoftware Engineering Intern\n\n### Link to Internship Posting\n\nhttps://example.com/careers/123';
const run = (issues, issuePolicy) => processRepository({ repository: { ...base, issuePolicy }, githubClient: { fetchRecentIssues: async () => issues } });

test('mixed job-list sources admit role submissions, not discussion or editing requests', async () => {
  const result = await run([
    issue(1, 'Built a little New Grad Job Tracker using your repo!', '### Issue/Question\n\nI built a job tracker.', ['misc']),
    issue(2, 'New Internship', form, ['new_internship']),
    issue(3, 'Editing Role', form, ['edit_role']),
    issue(4, 'Hardware engineering', 'The page is not loading.'),
  ], 'structured-submissions');
  assert.deepEqual(result.items.map(x => x.sourceId), ['example/jobs#2']);
  assert.equal(result.items[0].title, 'Software Engineering Intern — Example');
  assert.equal(result.items[0].sourceTitle, 'New Internship');
  assert.equal(result.items[0].description, form);
  assert.equal(result.openIssues, 1);
});

test('BDO-style and SpeedyApply form headings retain genuine submissions', async () => {
  const result = await run([
    issue(1, 'Add internship: <BDO> - <Technology - Bizapps>', '### Company\n\nBDO\n\n### Role title\n\nCo-op or Intern, Technology - BizApps\n\n### Application link\n\nhttps://example.com/jobs/123'),
    issue(2, 'New Position', '### Company Name\n\nExample\n\n### Position Title\n\nApplication Support Analyst\n\n### Position Application Link\n\nhttps://example.com/jobs/456'),
  ], 'structured-submissions');
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].title, 'Co-op or Intern, Technology - BizApps — BDO');
  assert.equal(result.items[1].title, 'Application Support Analyst — Example');
});

test('job-list admission rejects empty placeholders and non-web application fields', async () => {
  const result = await run([
    issue(1, 'New Internship', form.replace('Software Engineering Intern', '_No response_')),
    issue(2, 'New Internship', form.replace('https://example.com/careers/123', 'javascript:alert(1)')),
  ], 'structured-submissions');
  assert.equal(result.items.length, 0);
});

test('linked submissions keep direct role links and explicit inline fields, not product bugs', async () => {
  const result = await run([
    issue(1, 'Mechanize — Junior Software Engineer', 'https://jobs.ashbyhq.com/example/123'),
    issue(2, '[NEW JOB] Circle AI - Founding Forward Deployed Engineer', '**Company:** Circle AI\n**Position:** Founding Forward Deployed Engineer\n**Link:** https://example.com/careers/123'),
    issue(3, '[Product Bug] Jobs remain in the applied tab', 'The careers page https://example.com/careers/123 breaks the list.'),
  ], 'linked-submissions');
  assert.deepEqual(result.items.map(x => x.sourceId), ['example/jobs#1', 'example/jobs#2']);
});

test('company-careers sources retain employer submissions but not contributor tasks', async () => {
  const result = await run([
    issue(1, 'Open Source Contributor (GitHub)', '### Company Name\n\nExample\n\n### Career/Job Page URL\n\nhttps://example.com/careers\n\n### Repository Description\n\nWe are hiring software engineers.'),
    issue(2, 'Feature: Search and Filtering', 'Implement a filter in the application.'),
    issue(3, '[FOR HIRE] Freelance Developer', 'Available for freelance work.'),
  ], 'company-careers');
  assert.deepEqual(result.items.map(x => x.sourceId), ['example/jobs#1']);
});

test('unconfigured community job boards retain label-free and support roles unchanged', async () => {
  const result = await run([
    issue(1, '[PRESENCIAL] Application Support Analyst - Truppe', 'Contact us to apply.'),
    issue(2, 'New Internship', form),
  ]);
  assert.deepEqual(result.items.map(x => x.title), ['[PRESENCIAL] Application Support Analyst - Truppe', 'New Internship']);
});

test('catalog configures reviewed mixed sources and excludes directory-maintenance sources', async () => {
  const { readRepositoryCatalog } = await import('../src/modules/catalog/catalog-repository.mjs');
  const catalog = await readRepositoryCatalog('src/modules/catalog/repositories.json');
  const find = name => catalog.repositories.find(x => x.repository === name);
  assert.equal(find('SimplifyJobs/New-Grad-Positions').issuePolicy, 'structured-submissions');
  assert.equal(find('SimplifyJobs/Summer2026-Internships').issuePolicy, 'structured-submissions');
  assert.equal(find('negarprh/Canadian-Tech-Internships-2026').issuePolicy, 'structured-submissions');
  assert.equal(find('jobright-ai/2026-Software-Engineer-New-Grad').issuePolicy, 'linked-submissions');
  assert.equal(find('timqian/open-source-jobs').issuePolicy, 'company-careers');
  assert.equal(find('danielbayerlein/remote-jobs-germany'), undefined);
  assert.equal(find('cncf/gitjobs'), undefined);
});

test('plain Company/Role/Link submissions retain their source attribution', async () => {
  const result = await run([
    issue(1, 'Marshall Wace Graduate Programme', 'Company: Marshall Wace\nRole: Software/Infrastructure Graduate - 2027 - Singapore\nLink: https://example.com/careers/123\n\nAn employer graduate role.'),
  ], 'structured-submissions');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Marshall Wace Graduate Programme');
});

test('reviewed issue exclusions affect only that repository and issue number', async () => {
  const issues = [issue(6, 'Complaint about unrelated jobs', 'Discussion'), issue(8, 'Application Support Engineer', 'A real position')];
  const repository = { ...base, excludedIssues: [{ number: 6, reason: 'Reviewed complaint, not a vacancy', evidenceUrl: 'https://github.com/example/jobs/issues/6' }] };
  const result = await processRepository({ repository, githubClient: { fetchRecentIssues: async () => issues } });
  assert.deepEqual(result.items.map(x => x.sourceId), ['example/jobs#8']);
  assert.equal((await run(issues)).items.length, 2);
});

test('known community complaints and candidate submissions have reviewed exclusions', async () => {
  const { readRepositoryCatalog } = await import('../src/modules/catalog/catalog-repository.mjs');
  const catalog = await readRepositoryCatalog('src/modules/catalog/repositories.json');
  for (const [repository, numbers] of Object.entries({
    'clj-br/vagas': [6, 7], 'pythonjobs/jobs': [422], 'ios-taipei/MobileJobs': [3, 4],
    'android-cn/android-jobs': [109, 311, 329, 335], 'LinuxSuRen/remote-jobs-in-china': [67, 80, 81],
    'TADSG/jobs': [2], '3Tecnos-Development/vagas': [1, 3], 'matildaexp/remote-latam': [2, 4],
  })) {
    const source = catalog.repositories.find(x => x.repository === repository);
    assert.deepEqual(source.excludedIssues?.map(x => x.number), numbers);
  }
});
