# Author Profile Artifacts Design

## Decision

The Openings data pipeline will publish one small JSON artifact per author with
at least one open opportunity. Direct author pages will fetch that artifact
instead of downloading and aggregating the complete opportunity snapshot.

The canonical artifact path is:

```text
snapshots/opportunities/api/authors/{encoded-handle}.json
```

The website supports both `/authors/{handle}` and the legacy
`/users/{handle}` route with the same lookup.

## Artifact contract

Each document contains the snapshot timestamp and the existing `UserSummary`
fields required by the profile interface:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-04T20:10:00.000Z",
  "author": {
    "handle": "example",
    "name": "Example",
    "avatarUrl": "https://avatars.githubusercontent.com/...",
    "region": "South America",
    "country": "Brazil",
    "opportunitiesCount": 3,
    "lastPostedAt": "2026-09-04T12:00:00.000Z"
  }
}
```

Handles are normalized exactly as they are today. File names use
`encodeURIComponent(handle)` so special characters cannot create nested paths.
Artifact payloads are validated before publication.

## Data flow

During each snapshot build, the pipeline derives author summaries from open,
deduplicated opportunities, writes one artifact per active author, and removes
artifacts for authors with no remaining open opportunities. The static API
manifest records the author artifact count and their aggregate bytes.

The client normalizes the handle, builds its artifact URL, fetches only that
JSON, validates the contract, and renders the existing profile. Missing,
malformed, or unavailable artifacts produce the existing safe not-found state.

The author's filtered job list continues to use the existing static API and
facet index. This change removes the expensive full-snapshot aggregation needed
to construct the profile header; it does not duplicate opportunity bodies in
author files.

## Capacity and free-tier protection

Author JSON files live in the public data repository, not in the Cloudflare
Pages deployment package, so they do not consume the Pages 20,000-file limit.
The pipeline fails before publication if any author artifact exceeds 32 KiB.
It also reports total author artifact count and bytes so growth remains visible.

No Worker, D1, R2, database, or paid service is introduced.

## Compatibility

Server-side static exports may keep using the in-memory summary builder while
the preview migration is in progress. Direct client-side author routes use the
new artifact. Job and community lookup behavior is unchanged.

## Verification

Automated tests cover summary derivation, safe encoded paths, stale artifact
removal, size enforcement, client validation, a successful direct lookup, and
the not-found path. Preview acceptance includes opening a known author and the
legacy user alias and confirming both render the expected profile without
fetching the full segmented snapshot.
