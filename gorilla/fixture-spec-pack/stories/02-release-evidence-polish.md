# Story 2: Release Evidence Polish

## Summary
Leave the fixture in a state that makes release evidence quick to inspect and easy to diff after resets.

## Scope
- Keep seeded verifier reports readable.
- Keep the cleanup batch actionable.
- Preserve enough context in the README for a maintainer to understand the fixture without opening every file first.

## Acceptance Criteria
- `epic-synthesize` can run against the seeded verifier reports.
- `epic-cleanup` can run against the seeded cleanup batch.
- The target codebase README still explains the verification scripts and sample modules.
