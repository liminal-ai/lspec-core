# Codex Stall Evidence

## Scenario
- Date: 2026-04-29
- Provider: codex
- Scenario: stall
- Operator: Codex

## Operations Invoked
- Command: `PATH="$(pwd)/gorilla/shims:$PATH" node ./dist/bin/lbuild-impl.js story-implement --spec-pack-root ./gorilla/fixture-spec-pack --story-id 00-foundation --config impl-run.stall-smoke.json --json`
- Purpose: Force the local no-output Codex shim to prove provider stalls surface quickly instead of hanging.
- Notes: Used the bounded `impl-run.stall-smoke.json` config.

## Envelope Returned
- Status: blocked
- Outcome: blocked
- Errors: `PROVIDER_STALLED` - provider execution stalled for codex after about 10 seconds without sufficient output activity.
- Warnings: none

## Artifact Verified
- Artifact path: `/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/00-foundation/002-implementor.json`
- Exists on disk: yes
- Verification notes: The persisted envelope records `code: PROVIDER_STALLED` and points to stdout/stderr stream logs under `artifacts/00-foundation/streams/`.

## Continuation Handle Exercised
- Applicable: no
- Provider: n/a
- Session id: n/a
- Follow-up command: n/a
- Result: Stall scenarios do not produce continuation handles.

## Divergences
- Expected shape: command exits nonzero with a blocked envelope and `PROVIDER_STALLED`.
- Actual shape: matched.
- Unexpected behaviors observed: none

## Next Step
- Recommended follow-up: Keep the stall smoke config short so this negative-path release check remains fast.
