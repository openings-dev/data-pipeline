# Contributing to data-pipeline

Thanks for contributing to the `openings.dev` data layer.

## Scope

This repository owns:

- source repository catalog entries;
- GitHub issue ingestion and normalization;
- segmented opportunity snapshots;
- static API files consumed by the front-end;
- validation and build scripts for the data pipeline.

Front-end UI work belongs in `openings-dev/web`.

## Data Contract Rules

- Keep `snapshots/opportunities/**` segmented.
- Do not reintroduce `snapshots/opportunities.json`.
- Keep generated API files under `snapshots/opportunities/api/**`.
- Keep source repositories in `src/modules/catalog/repositories.json`.
- Do not commit secrets or private source data.
- Do not add mock datasets as substitutes for the generated snapshots.

The front-end consumes this repository only through raw GitHub URLs. Do not require the front-end to import local JSON files.

## Local Workflow

Requirements:

- Node.js `>=20.0.0`
- npm

```bash
npm install
cp .env.example .env
npm run validate
```

`OPENINGS_GITHUB_TOKEN` is optional but recommended for local snapshot builds.

Build snapshots:

```bash
npm run build:snapshot
```

## Adding a Source Repository

Update `src/modules/catalog/repositories.json` with:

- `repository`: `owner/name`
- `url`: GitHub repository URL
- `country`: human-readable country name
- `countryCode`: uppercase country code or `GLOBAL`
- `region`: human-readable region

Every new source must have at least one currently open GitHub Issue that is clearly a public job. Record that Issue URL during review. Pull Requests, Discussions, repository README lists, and contribution tasks are not qualifying evidence.

Mixed job-list repositories need an explicit `issuePolicy` in their catalog entry. Review their issue forms before selecting a policy:

- `structured-submissions` requires filled company, role and HTTP(S) application-link fields in the submitted form.
- `linked-submissions` also accepts a role-titled issue whose entire body is a direct job link, as used by the reviewed Jobright sources.
- `company-careers` accepts the reviewed open-source employer form with company, career URL and repository description.

These policies reject discussion/edit/maintenance labels within those sources. Ordinary community boards without a policy retain their existing admission behavior. Generic form titles are replaced only with the explicitly submitted role and company; the original issue title is retained as `sourceTitle`. Do not apply discovery's keyword scorer globally to ingestion: legitimate support and label-free jobs must survive.

When retiring a directory/software source, remove its catalog entry and record the evidence in `src/modules/discovery/discovery-decisions.json` so discovery does not propose it again. Rebuild the segmented snapshots and remove only matching unsent entries from the publishing outbox; published history is separate.

Use `Global` only when the source genuinely publishes jobs without a country scope. It is not a fallback for an unknown or unreviewed location; unresolved location stays in the discovery inbox until a maintainer can classify it.

The preferred flow is:

```bash
npm run discover:communities
npm run review:communities -- --report .artifacts/community-discovery/report.json --reviews .artifacts/community-discovery/reviews.json
```

The review command is preview-only unless `--apply` is supplied. Discovery never publishes a source automatically.

After editing the catalog, run:

```bash
npm run validate
npm run build:snapshot
```

Commit catalog changes together with any generated snapshot changes when the dataset changes.

## Pull Requests

Keep pull requests focused on one type of change:

- catalog update;
- pipeline or normalization update;
- validation update;
- documentation update.

Before opening a pull request:

- [ ] `npm run validate` passes.
- [ ] Generated snapshots are included when data output changed.
- [ ] No secrets are committed.
- [ ] No monolithic snapshot file was added.
- [ ] Raw API file paths remain compatible with the front-end.
