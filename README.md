<p align="center">
  <a href="https://openings.dev">
    <img src="public/logo.png" alt="openings.dev" width="190" />
  </a>
</p>

# data-pipeline

Public data pipeline and static JSON API for `openings.dev`.

This repository owns the source catalog, GitHub ingestion pipeline, normalized opportunity snapshots, and static API files consumed by the front-end through raw GitHub URLs.

## Repository Role

`openings-dev/data-pipeline` is the data publication layer. It is intentionally separate from the front-end:

- the data repo generates and stores publishable JSON snapshots;
- the front-end reads those snapshots remotely from `raw.githubusercontent.com`;
- the front-end must not copy, import, or mock these JSON files locally.

## Architecture

```txt
src/
  app/
    run-build.mjs
  config/
    env.mjs
  modules/
    build/                 repository selection and country processing
    catalog/               source repository catalog reader
    github/                GitHub API client
    observability/         structured CLI logger
    opportunities/         issue normalization and enrichment
    snapshot/              segmented snapshot and static API builders
    storage/               JSON read/write helpers
    validation/            repository validation checks
  shared/
    errors/
    utils/
scripts/
  build-opportunities.mjs
  migrate-opportunities-snapshot.mjs
  validate-repo.mjs
snapshots/
  opportunities/           published static API and segmented snapshots
```

## Source Catalog

The source catalog lives at:

```txt
src/modules/catalog/repositories.json
```

Each catalog entry describes a public GitHub repository that posts opportunities as issues, including repository name, URL, country, country code, and region.

## Documented reuse policy

The active catalog is limited to 16 reviewed issue boards. `src/modules/catalog/source-rights.json` records the actual MIT license text, pinned license URL/blob hash, README evidence and license chronology. Admission requires an entry in this register; adding a repository to the catalog or approving a discovery candidate alone cannot activate an unreviewed source. `held-repositories.json` retains inactive source metadata and previous issue exclusions for a future review, not ingestion.

The bounded review found explicit README MIT language and a repository license predating the indexed issues. Together with [GitHub Terms D.6](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#d-user-generated-content), this is our documented basis for evaluating issue contributions. It is not a claim that public content is public domain, that every employer endorsed Openings, or that all third-party rights are cleared. Openings mentions in a README are not treated as permission. Separate agreements, content exceptions and contributor authority still matter.

Published page and detail descriptions end with an attributed “Source and license notices” section containing complete notices for every deduplicated source. This presentation-only addition is applied after normalization/deduplication; raw source descriptions, card excerpts, search and facets remain unchanged. Each source shard and published job includes `contentLicenses`; deduplicated jobs preserve notices for every contributing source. The manifest also links `api/source-licenses.json`. Consumers must retain these notices with redistributed content and provide accessible attribution; source links alone do not replace the MIT notice condition. Issue URLs and contributor attribution remain in the records.

To apply a reviewed catalog restriction to existing shards without network requests or external publication, run `npm run rebuild:reviewed-snapshot`. This filters source shards before deduplication, removes obsolete generated files, and removes unsupported pending job/author/community envelopes. Retained pending envelopes are refreshed with the restricted content and notices. Historical external publications and monthly reports are not altered. Snapshot generation time changes, but issue timestamps are preserved; this command does not represent a new upstream fetch.

## Published Data Layout

```txt
snapshots/opportunities/
  index.json
  api/
    manifest.json
    facet-index.json
    job-ids.json
    page-lookup.json
    search-index.json
    order/
      recent.json
    pages/
      page-0001.json
    jobs/
      ab.json
  countries/
    br/
      index.json
      repositories/
        backend-br-vagas.json
```

Primary files:

- `api/manifest.json`: entry point for front-end list loading.
- `api/order/recent.json`: opportunity IDs in default recent order.
- `api/page-lookup.json`: maps opportunity IDs to page files.
- `api/pages/*.json`: paginated opportunity payloads.
- `api/jobs/*.json`: bucketed job detail records.
- `api/job-ids.json`: static job IDs used for front-end static params.
- `index.json`: global segmented snapshot index.
- `countries/*/index.json`: country-level snapshot indexes.
- `countries/*/repositories/*.json`: repository-level shards.

There is no monolithic `snapshots/opportunities.json` file.

## Raw API Consumption

The front-end consumes this repository through raw GitHub URLs:

```txt
https://raw.githubusercontent.com/openings-dev/data-pipeline/main/snapshots/opportunities
https://raw.githubusercontent.com/openings-dev/data-pipeline/main
```

Example:

```ts
const baseUrl =
  "https://raw.githubusercontent.com/openings-dev/data-pipeline/main/snapshots/opportunities";

const manifest = await fetch(`${baseUrl}/api/manifest.json`).then((response) =>
  response.json(),
);
```

## Build Flow

1. Load environment and repository catalog.
2. Select repositories using optional country and repository limits.
3. Fetch public GitHub issues.
4. Normalize opportunities and enrich metadata.
5. Build segmented snapshots and static API files.
6. Write only changed JSON files.
7. Prune stale snapshot files.

GitHub Actions runs the update workflow on a schedule and commits changed files under `snapshots/opportunities/**`.

## Monthly public reports

The pipeline publishes one immutable point-in-time report per month under [`reports/monthly`](./reports/monthly). Each report records open jobs, catalog communities, active repositories, countries, regions, leading locations and technologies, work-model signals, and salary-disclosure coverage directly from the public manifest.

Generate the current month locally with:

```bash
npm run report:monthly
```

If a report for the snapshot month already exists with different contents, generation stops instead of rewriting public history. The scheduled workflow runs after the first snapshot cycle of each month and updates only the mutable report index.

## Community Discovery

Discovery searches open GitHub Issues for repositories that publish jobs. It creates a review inbox; it never adds sources, rebuilds snapshots, commits, or pushes by itself.

Run one query while tuning the rules:

```bash
DISCOVERY_MAX_QUERIES=1 npm run discover:communities
```

Run the full multilingual sweep:

```bash
npm run discover:communities
```

The local report is written to `.artifacts/community-discovery/report.json` and `report.md`. A `partial` report means one or more GitHub operations failed and must not be treated as complete.

After reviewing each Issue URL, create `.artifacts/community-discovery/reviews.json`:

```json
{
  "decisions": [
    {
      "repository": "owner/jobs",
      "decision": "approved",
      "reason": "At least one open GitHub Issue is a public job",
      "country": "India",
      "countryCode": "IN",
      "region": "Asia",
      "locale": "en-IN",
      "scope": "national",
      "evidenceUrl": "https://github.com/owner/jobs/issues/123",
      "confirmEvidence": true
    }
  ]
}
```

Preview first, then apply explicitly:

```bash
npm run review:communities -- --report .artifacts/community-discovery/report.json --reviews .artifacts/community-discovery/reviews.json
npm run review:communities -- --report .artifacts/community-discovery/report.json --reviews .artifacts/community-discovery/reviews.json --apply
```

Applying reviews only updates the source catalog and decision registry. Rebuilding and publishing the snapshot remain separate maintainer actions.

The weekly `Discover Communities` workflow runs the same review-first process, uploads both reports, and opens one review Issue when qualified candidates exist. It does not mutate the catalog. Partial runs retain their artifacts and fail the final workflow gate.

## Local Setup

Requirements:

- Node.js `>=20.0.0`
- npm

```bash
npm install
cp .env.example .env
npm run validate
```

`OPENINGS_GITHUB_TOKEN` is optional but recommended to increase GitHub API quota.

Build a snapshot locally:

```bash
npm run build:snapshot
```

## Environment Variables

- `OPENINGS_GITHUB_TOKEN`: optional GitHub token.
- `MAX_ISSUES_PER_REPOSITORY`: default `30`, min `1`, max `100`.
- `MAX_REPOSITORIES`: default `0` (`0` means no cap), max `50000`.
- `REQUEST_DELAY_MS`: default `120`, min `0`, max `10000`.
- `COUNTRY_CODES`: optional comma-separated filter, for example `BR,US,PT`.
- `DISCOVERY_OUTPUT_DIR`: local discovery report directory.
- `DISCOVERY_MAX_QUERIES`: optional query cap; `0` runs every configured query.
- `DISCOVERY_MAX_RESULTS_PER_QUERY`: result cap per GitHub search query.
- `DISCOVERY_REQUEST_DELAY_MS`: delay between discovery API requests.

## Validation

```bash
npm run validate
```

Validation checks:

- required JSON files exist and parse;
- segmented snapshot structure is valid;
- monolithic legacy snapshot output is forbidden;
- snapshot JSON files stay under the configured line limit;
- source modules stay under the configured line limit;
- JavaScript modules parse successfully.

## Migration Script

`npm run migrate:snapshot` exists only for maintainers converting an old local monolithic snapshot into the segmented layout. New work must keep the segmented static API structure.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

[MIT](./LICENSE)
