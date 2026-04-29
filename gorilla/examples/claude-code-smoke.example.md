# Gorilla Evidence Example

## Scenario
- Date: 2026-04-28
- Provider: claude-code
- Scenario: smoke
- Operator: fixture-example

## Operations Invoked
- Command: `inspect`, `preflight`, `story-implement`, `story-self-review`, `story-verify`
- Purpose: Validate the happy-path story workflow against the committed fixture.
- Notes: The continuation handle from `story-implement` was reused during self-review.

## Envelope Returned
- Status: ok
- Outcome: ready-for-verification
- Errors: none
- Warnings: none

## Artifact Verified
- Artifact path: `gorilla/fixture-spec-pack/artifacts/01-structured-output-hardening/implementor-001.json`
- Exists on disk: yes
- Verification notes: The persisted envelope matched the stdout payload for the sampled command.

## Continuation Handle Exercised
- Applicable: yes
- Provider: claude-code
- Session id: example-session-id
- Follow-up command: `story-self-review`
- Result: reused successfully

## Divergences
- Expected shape: one JSON object matching the story implementor payload contract
- Actual shape: matched expected shape
- Unexpected behaviors observed: none

## Next Step
- Recommended follow-up: proceed to the Codex resume scenario.
