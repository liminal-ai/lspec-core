# Gorilla Evidence: Story Id Recovery

## Purpose

Verify TC-5.3a: a fresh agent can recover a prior story-lead attempt when it is given only the spec-pack root and story id, not the story run id.

## Scenario Setup

1. Use a spec pack that contains `stories/<story-id>.md`.
2. Create or reuse at least one durable story-lead attempt under `artifacts/<story-id>/story-lead/`.
3. Remove the story run id from the fresh-agent prompt.
4. Give the agent only:
   - `spec-pack-root`
   - `story-id`
   - the instruction to recover current story-lead status

## Recovery Procedure

The fresh agent should run:

```bash
lbuild-impl story-orchestrate status --spec-pack-root <spec-pack-root> --story-id <story-id> --json
```

Expected result for a single prior attempt:

- `result.case` is `single-attempt`
- `result.storyId` matches the requested story id
- `result.storyRunId` is discovered from durable artifacts
- `result.currentSnapshotPath` points to the latest durable checkpoint
- `result.currentStatus` distinguishes running, accepted, interrupted, blocked, needs-ruling, or failed state
- `result.finalPackagePath` is present only when a terminal final package exists

Expected result for multiple plausible attempts:

- `result.case` is `ambiguous-story-run`
- `result.candidates[]` lists candidate story run ids, statuses, updated times, current snapshot paths, and final package paths when present
- The agent asks the caller to choose a story run id rather than guessing

If the agent is trying to start work instead of read status, it may run:

```bash
lbuild-impl story-orchestrate run --spec-pack-root <spec-pack-root> --story-id <story-id> --json
```

Expected orientation behavior:

- accepted prior attempt: reports `existing-accepted-attempt`
- interrupted prior attempt: reports `resume-required`
- active prior attempt: reports `active-attempt-exists`
- ambiguous attempts: reports `ambiguous-story-run`
- no prior story-lead attempt but primitive artifacts exist: starts from an orientation package listing existing story artifacts

## Evidence Record

Date: 2026-05-02

Provider / caller harness: fresh generic CLI agent

Spec pack root: `/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311`

Story id: `00-foundation`

Story run id withheld from prompt: yes

Command:

```bash
lbuild-impl story-orchestrate status --spec-pack-root /Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311 --story-id 00-foundation --json
```

Observed result.case: `single-attempt`

Discovered storyRunId: `00-foundation-story-run-001`

Current snapshot: `/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311/artifacts/00-foundation/story-lead/001-current.json`

Final package: `/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311/artifacts/00-foundation/story-lead/001-final-package.json`

Agent decision: recovered the only durable attempt by story id, observed `currentStatus=interrupted`, and identified the discovered `storyRunId` for explicit follow-up work.

Transcript excerpt:

```text
$ lbuild-impl story-orchestrate status --spec-pack-root /Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311 --story-id 00-foundation --json
{"command":"story-orchestrate status","version":1,"status":"ok","outcome":"single-attempt","result":{"case":"single-attempt","storyId":"00-foundation","storyRunId":"00-foundation-story-run-001","currentSnapshotPath":"/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311/artifacts/00-foundation/story-lead/001-current.json","currentStatus":"interrupted","latestEventSequence":3,"finalPackagePath":"/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-story-id-recovery/062d4d9d-5289-49d2-a4e5-34e4019a2311/artifacts/00-foundation/story-lead/001-final-package.json"}}
```

## Pass Criteria

The run passes when the transcript shows the fresh agent recovered the attempt using `story-orchestrate status` or the equivalent `run` orientation behavior, without being given the story run id up front.
