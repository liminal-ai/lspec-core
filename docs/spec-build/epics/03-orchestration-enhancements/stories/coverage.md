# Coverage Artifact: Orchestration Enhancements

This artifact resolves the epic's overlapping recommended story breakdown into a single-owner publication map. The epic and tech design use Story 0 for foundational contract/config work and later stories for runtime behavior; this table fixes final story ownership so every AC and TC lands exactly once.

---

## Coverage Gate

| AC | TC(s) | Story |
|----|-------|-------|
| AC-1.1 | TC-1.1a, TC-1.1b | Story 1 |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 1 |
| AC-1.3 | TC-1.3a | Story 1 |
| AC-1.4 | TC-1.4a, TC-1.4b, TC-1.4c | Story 0 |
| AC-1.5 | TC-1.5a, TC-1.5b, TC-1.5c, TC-1.5d | Story 0 |
| AC-1.6 | TC-1.6a, TC-1.6b | Story 1 |
| AC-1.7 | TC-1.7a | Story 1 |
| AC-2.1 | TC-2.1a, TC-2.1b, TC-2.1c | Story 2 |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 0 |
| AC-2.3 | TC-2.3a, TC-2.3b, TC-2.3c, TC-2.3d, TC-2.3e | Story 2 |
| AC-2.4 | TC-2.4a, TC-2.4b, TC-2.4c | Story 2 |
| AC-2.5 | TC-2.5a, TC-2.5b, TC-2.5c | Story 2 |
| AC-2.6 | TC-2.6a, TC-2.6b, TC-2.6c | Story 3 |
| AC-2.7 | TC-2.7a, TC-2.7b | Story 2 |
| AC-2.8 | TC-2.8a, TC-2.8b | Story 2 |
| AC-2.9 | TC-2.9a, TC-2.9b | Story 4 |
| AC-2.10 | TC-2.10a, TC-2.10b | Story 2 |
| AC-3.1 | TC-3.1a, TC-3.1b | Story 3 |
| AC-3.2 | TC-3.2a, TC-3.2b, TC-3.2c, TC-3.2d | Story 3 |
| AC-3.3 | TC-3.3a, TC-3.3b, TC-3.3c | Story 3 |
| AC-3.4 | TC-3.4a, TC-3.4b, TC-3.4c, TC-3.4d, TC-3.4e, TC-3.4f, TC-3.4g, TC-3.4h, TC-3.4i | Story 3 |
| AC-3.5 | TC-3.5a, TC-3.5b, TC-3.5c, TC-3.5d | Story 3 |
| AC-3.6 | TC-3.6a, TC-3.6b | Story 3 |
| AC-3.7 | TC-3.7a, TC-3.7b, TC-3.7c | Story 3 |
| AC-3.8 | TC-3.8a | Story 3 |
| AC-3.9 | TC-3.9a, TC-3.9b | Story 3 |
| AC-3.10 | TC-3.10a, TC-3.10b, TC-3.10c | Story 3 |
| AC-3.11 | TC-3.11a, TC-3.11b | Story 3 |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 |
| AC-4.2 | TC-4.2a, TC-4.2b | Story 4 |
| AC-4.3 | TC-4.3a, TC-4.3b | Story 1 |
| AC-4.4 | TC-4.4a, TC-4.4b | Story 4 |
| AC-4.5 | TC-4.5a | Story 4 |
| AC-4.6 | TC-4.6a, TC-4.6b, TC-4.6c | Story 4 |
| AC-4.7 | TC-4.7a, TC-4.7b | Story 4 |
| AC-5.1 | TC-5.1a, TC-5.1b, TC-5.1c | Story 4 |
| AC-5.2 | TC-5.2a | Story 4 |
| AC-5.3 | TC-5.3a | Story 2 |
| AC-5.4 | TC-5.4a, TC-5.4b | Story 4 |

Coverage result: every AC appears at least once, and every TC is assigned exactly once.

---

## Integration Path Trace

### Path 1: Primitive caller heartbeat monitoring

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Caller defaults resolved | Caller harness and cadence precedence are resolved before long-running work begins | Story 0 | TC-1.5c |
| Runtime emits bounded heartbeat | A long-running primitive command emits a fixed-cadence heartbeat | Story 1 | TC-1.1a |
| JSON stdout stays parseable | Heartbeat output does not contaminate exact JSON stdout | Story 1 | TC-1.2a |
| Caller sees host-specific guidance | The monitoring action is phrased for the caller harness reading output | Story 0 | TC-1.4a |
| Skill guidance reinforces polling | Published process guidance tells Codex callers how to keep polling | Story 1 | TC-4.3a |

### Path 2: Story orchestration happy path

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Story request validated | Caller can only run orchestration for a known story id | Story 0 | TC-2.2a |
| Run surface exposed | `story-orchestrate run` / `resume` / `status` are available | Story 2 | TC-2.1a |
| Attempt selection is deterministic | Runtime starts a new attempt or reports the correct follow-up for existing work | Story 2 | TC-2.3a |
| Durable state written | Current snapshot, event history, and terminal package are persisted | Story 2 | TC-2.4a |
| Caller sees terminal marker | Attached output identifies the final package when the run finishes | Story 2 | TC-2.8a |
| Final package is acceptance-ready | Final package contains evidence, checks, log handoff, and receipt draft | Story 3 | TC-3.1a |
| Impl-lead acceptance stays gated | Receipt and commit blockers are surfaced before run-level acceptance | Story 3 | TC-3.7c |

### Path 3: Review, ruling, and recovery

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Recovery by story id | Caller can recover an attempt without the story run id | Story 2 | TC-2.5a |
| Review request reopens work | Impl-lead can reopen a prior attempt with structured review input | Story 3 | TC-2.6a |
| Review history is preserved | Reopened attempts retain review history across accept/reject cycles | Story 3 | TC-3.9a |
| Cleanup carry-forward is explicit | Deferred or accepted-risk items remain visible for later cleanup | Story 3 | TC-3.10a |
| Provider variants are validated | Provider-specific story-lead behavior is proven before a default is chosen | Story 4 | TC-5.4a |

Integration result: every critical path segment has a story owner and at least one TC.
