# Copilot Structured Output Evidence

## Scenario
- Date: 2026-04-29
- Provider: copilot
- Scenario: structured-output
- Operator: Codex

## Operations Invoked
- Command: `node ./dist/bin/lbuild-impl.js quick-fix --spec-pack-root ./gorilla/fixture-spec-pack --config impl-run.copilot-smoke.json --working-directory ./gorilla/fixture-spec-pack/target-codebase --request-text "Make exactly one documentation-only edit: change the README H1 from 'Animal Summary Target Codebase' to 'Animal Summary Smoke Fixture'. Do not edit any other file." --json`
- Purpose: Exercise Copilot quick-fix structured output on a tiny one-file documentation edit.
- Notes: The target README H1 changed to `Animal Summary Smoke Fixture`; no other operation was required for this smoke scenario.

## Envelope Returned
- Status: ok
- Outcome: ready-for-verification
- Errors: none
- Warnings: none

## Artifact Verified
- Artifact path: `/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/quick-fix/001-quick-fix.json`
- Exists on disk: yes
- Verification notes: The persisted envelope has `provider: copilot`, `model: gpt-5.5`, and the provider stdout stream is recorded at `/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/quick-fix/streams/001-quick-fix.stdout.log`.

## Continuation Handle Exercised
- Applicable: no
- Provider: n/a
- Session id: n/a
- Follow-up command: n/a
- Result: This smoke scenario intentionally verifies Copilot quick-fix structured output only.

## Divergences
- Expected shape: quick-fix returns a JSON envelope with `status: ok`, `outcome: ready-for-verification`, and a persisted artifact.
- Actual shape: matched.
- Unexpected behaviors observed: none

## Next Step
- Recommended follow-up: Use this one-file documentation edit as the bounded Copilot release smoke instead of broader cleanup operations.
