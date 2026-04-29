# Claude Code Smoke Evidence

## Scenario
- Date: 2026-04-29
- Provider: claude-code
- Scenario: smoke
- Operator: Codex

## Operations Invoked
- Command: `node ./dist/bin/lbuild-impl.js inspect --spec-pack-root ./gorilla/fixture-spec-pack --json`
- Purpose: Confirm the fixture spec pack is readable and ready.
- Notes: Returned `status: ok`, `outcome: ready`.
- Command: `node ./dist/bin/lbuild-impl.js preflight --spec-pack-root ./gorilla/fixture-spec-pack --config impl-run.claude-smoke.json --json`
- Purpose: Validate the Claude smoke run-config and provider availability before the real provider call.
- Notes: Returned `status: ok`, `outcome: ready`.
- Command: `node ./dist/bin/lbuild-impl.js story-verify --spec-pack-root ./gorilla/fixture-spec-pack --story-id 00-foundation --config impl-run.claude-smoke.json --json`
- Purpose: Exercise Claude Code structured verifier output through the built CLI using the bounded smoke config.
- Notes: Used `model: haiku` and `reasoning_effort: low`.

## Envelope Returned
- Status: ok
- Outcome: pass
- Errors: none
- Warnings: none

## Artifact Verified
- Artifact path: `/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/00-foundation/001-verify.json`
- Exists on disk: yes
- Verification notes: The persisted envelope matches the successful `story-verify` result and includes `provider: claude-code`, `model: haiku`, `mode: initial`, and session id `468b5b92-b0ab-403c-aeaa-497a93abc087`.

## Continuation Handle Exercised
- Applicable: no
- Provider: n/a
- Session id: n/a
- Follow-up command: n/a
- Result: This smoke scenario intentionally verifies initial Claude Code structured output only.

## Divergences
- Expected shape: `inspect`, `preflight`, and `story-verify` return JSON envelopes; verifier outcome is `pass`.
- Actual shape: matched.
- Unexpected behaviors observed: none

## Next Step
- Recommended follow-up: Keep Claude release smoke on the bounded `impl-run.claude-smoke.json` config rather than the implementation-grade Claude config.
