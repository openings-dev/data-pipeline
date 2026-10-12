# Social Publisher Dispatch Fallback

## Context

The scheduled data pipeline successfully builds, publishes, commits, and pushes the opportunities snapshot. Its final cross-repository notification currently uses a dedicated GitHub credential. When that credential expires, GitHub returns HTTP 401 and marks the entire pipeline as failed even though the snapshot is already durable.

The social publisher also runs on its own schedule and safely discovers new source commits, so the cross-repository notification is an optimization rather than a durability boundary.

## Decision

Keep the immediate notification attempt after a successful snapshot push, but treat a notification failure as a visible warning instead of a pipeline failure. The scheduled social publisher remains the durable fallback and processes the latest committed snapshot without duplicating already recorded publications.

## Behavior

- Snapshot validation, generation, production submission, commit, and push remain fail-closed.
- A changed and successfully pushed snapshot still triggers an immediate repository dispatch attempt.
- A successful dispatch keeps the current fast path.
- A failed dispatch emits a clear GitHub Actions warning that the publisher will use its scheduled fallback, then lets the data pipeline complete successfully.
- The notification credential remains scoped only to the notification step.
- No social publisher code or publication state semantics change.

## Verification

Workflow tests will assert that the notification command explicitly handles dispatch failure, emits a warning, and does not weaken the snapshot push boundary. The full repository test and validation suites must pass. After publication, a manually triggered data-pipeline run must complete successfully even while the expired credential still returns HTTP 401; a subsequent social publisher run must remain healthy.
