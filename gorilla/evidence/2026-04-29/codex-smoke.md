# Gorilla Evidence Report

## Scenario
- Date: 2026-04-29
- Provider: codex
- Scenario: smoke
- Operator: Codex story implementor

## Operations Invoked
- Command: `node ./dist/bin/lspec.js inspect --spec-pack-root ./gorilla/fixture-spec-pack --json`
- Purpose: Verify that the gorilla fixture spec pack works end-to-end through the built package CLI, stdout envelope rendering, and persisted artifact path.
- Notes: This smoke run used the provider label `codex` for the bounded Story 5 evidence scenario. The selected `inspect` operation is providerless by design, matching the follow-up request's low-quota recommendation.

## Envelope Returned
- Status: `ok`
- Outcome: `ready`
- Errors: `[]`
- Warnings: `[]`

```json
{
  "command": "inspect",
  "version": 1,
  "status": "ok",
  "outcome": "ready",
  "result": {
    "status": "ready",
    "specPackRoot": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack",
    "techDesignShape": "two-file",
    "artifacts": {
      "epicPath": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/epic.md",
      "techDesignPath": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/tech-design.md",
      "techDesignCompanionPaths": [],
      "testPlanPath": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/test-plan.md",
      "storiesDir": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories"
    },
    "stories": [
      {
        "id": "00-foundation",
        "title": "Story 0: Foundation and Gate Wiring",
        "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories/00-foundation.md",
        "order": 1
      },
      {
        "id": "01-structured-output-hardening",
        "title": "Story 1: Structured Output Hardening",
        "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories/01-structured-output-hardening.md",
        "order": 2
      },
      {
        "id": "02-release-evidence-polish",
        "title": "Story 2: Release Evidence Polish",
        "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories/02-release-evidence-polish.md",
        "order": 3
      }
    ],
    "inserts": {
      "customStoryImplPromptInsert": "absent",
      "customStoryVerifierPromptInsert": "absent"
    },
    "blockers": [],
    "notes": []
  },
  "errors": [],
  "warnings": [],
  "artifacts": [
    {
      "kind": "result-envelope",
      "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/inspect/001-inspect.json"
    }
  ],
  "startedAt": "2026-04-29T03:46:39.401Z",
  "finishedAt": "2026-04-29T03:46:39.420Z"
}
```

## Artifact Verified
- Artifact path: `/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/inspect/001-inspect.json`
- Exists on disk: captured during run; regeneratable via the same command. Full content is embedded below.
- Verification notes: The persisted artifact was read after the CLI run. The embedded JSON below matches the regenerated artifact content for command, version, status, outcome, result shape, story inventory, timestamps, and artifact reference. The artifact is a runtime byproduct of `inspect`; the fixture reset tool may remove and regenerate it.

```json
{
  "command": "inspect",
  "version": 1,
  "status": "ok",
  "outcome": "ready",
  "result": {
    "status": "ready",
    "specPackRoot": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack",
    "techDesignShape": "two-file",
    "artifacts": {
      "epicPath": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/epic.md",
      "techDesignPath": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/tech-design.md",
      "techDesignCompanionPaths": [],
      "testPlanPath": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/test-plan.md",
      "storiesDir": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories"
    },
    "stories": [
      {
        "id": "00-foundation",
        "title": "Story 0: Foundation and Gate Wiring",
        "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories/00-foundation.md",
        "order": 1
      },
      {
        "id": "01-structured-output-hardening",
        "title": "Story 1: Structured Output Hardening",
        "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories/01-structured-output-hardening.md",
        "order": 2
      },
      {
        "id": "02-release-evidence-polish",
        "title": "Story 2: Release Evidence Polish",
        "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/stories/02-release-evidence-polish.md",
        "order": 3
      }
    ],
    "inserts": {
      "customStoryImplPromptInsert": "absent",
      "customStoryVerifierPromptInsert": "absent"
    },
    "blockers": [],
    "notes": []
  },
  "errors": [],
  "warnings": [],
  "artifacts": [
    {
      "kind": "result-envelope",
      "path": "/Users/leemoore/code/lspec-core/gorilla/fixture-spec-pack/artifacts/inspect/001-inspect.json"
    }
  ],
  "startedAt": "2026-04-29T03:46:39.401Z",
  "finishedAt": "2026-04-29T03:46:39.420Z"
}
```

## Continuation Handle Exercised
- Applicable: no
- Provider:
- Session id:
- Follow-up command:
- Result: The `inspect` operation has no continuation handle by contract.

## Divergences
- Expected shape: `command`, `version`, `status`, `outcome`, `result`, `errors`, `warnings`, `artifacts`, `startedAt`, and `finishedAt` fields with an `ok` / `ready` outcome for a valid fixture pack.
- Actual shape: Matched the expected envelope shape and persisted artifact contract.
- Unexpected behaviors observed: none

## Next Step
- Recommended follow-up: Keep this report as the Story 5 real smoke evidence and use later release runs to populate additional provider/scenario evidence files.

## TC-5.7b Scope Note (orchestrator ruling, 2026-04-29)

This evidence report uses the providerless `inspect` operation as the bounded smoke scenario. Per AC-5.9, the gorilla evidence directory may be "empty or with one example" at Story 5 acceptance. Per AC-6.5d, fuller per-provider per-scenario evidence (the complete `gorilla/prompt.md` scenarios for claude-code, codex, copilot) is a Story 7 release-window obligation and will be regenerated within 7 days of release tag. This single-op evidence proves the template format and the gorilla fixture pack work end-to-end against the built CLI; release-time evidence will exercise provider-backed operations.
