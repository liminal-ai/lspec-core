# Story 2: Story-Lead Run Surface and Durable Ledger

### Summary
<!-- Jira: Summary field -->
Add `story-orchestrate run/resume/status`, deterministic attempt discovery, durable story-run state, terminal markers, and recovery by story id.

### Description
<!-- Jira: Description field -->
**User Profile:** Liminal Spec implementation maintainer or orchestration agent running `lbuild-impl` against a spec pack.

**Objective:** Give the caller one story-level invocation surface that either starts new work safely or reports the correct follow-up for existing work, while persisting durable story-run state that can be recovered by `spec-pack-root + story-id`.

**In Scope:**
- `story-orchestrate run`, `resume`, and `status` command surfaces
- `resume` shell/help exposure and neutral dispatch/input validation
- deterministic attempt discovery over primitive artifacts and prior story-lead attempts
- current snapshot, append-only event history, and terminal package persistence
- story-level heartbeats and terminal completion markers
- interruption discoverability and artifact-based recovery boundary recording
- validation evidence for story-id recovery

**Out of Scope:**
- review-request or ruling incorporation inside the story-lead loop
- detailed acceptance-package semantics, receipt/commit readiness, and cleanup handoff logic
- provider selection defaults and skill alignment

**Dependencies:**
- Story 1: primitive heartbeat behavior

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** `story-orchestrate` exposes `run`, `resume`, and `status` subcommands.

- **TC-2.1a: Run command exists**
  - Given: The built CLI
  - When: A caller invokes `lbuild-impl story-orchestrate run --help`
  - Then: Help text describes running a story-lead for one story after orienting from existing story artifacts
- **TC-2.1b: Resume command exists**
  - Given: The built CLI
  - When: A caller invokes `lbuild-impl story-orchestrate resume --help`
  - Then: Help text describes resuming or reopening a story-lead attempt
- **TC-2.1c: Status command exists**
  - Given: The built CLI
  - When: A caller invokes `lbuild-impl story-orchestrate status --help`
  - Then: Help text describes reading durable story-lead status

**AC-2.3:** `run` orients from existing story artifacts before starting work.

- **TC-2.3a: No prior story work**
  - Given: A story has no primitive artifacts and no story-lead attempts
  - When: Caller invokes `story-orchestrate run`
  - Then: Runtime creates the first story-lead attempt for that story
- **TC-2.3b: Prior primitive artifacts only**
  - Given: A story has implementor or verifier artifacts but no story-lead attempt
  - When: Caller invokes `story-orchestrate run`
  - Then: Runtime starts a story-lead attempt and provides an orientation package that includes existing story artifacts
- **TC-2.3c: Prior accepted attempt**
  - Given: A story already has a story-lead scoped accepted attempt
  - When: Caller invokes `story-orchestrate run`
  - Then: Runtime reports the existing accepted attempt and does not start duplicate work silently
- **TC-2.3d: Prior interrupted attempt**
  - Given: A story has one clearly interrupted or incomplete story-lead attempt and no active conflict
  - When: Caller invokes `story-orchestrate run`
  - Then: Runtime reports the attempt and says explicit `resume` is required to continue it
- **TC-2.3e: Ambiguous attempts**
  - Given: A story has multiple plausible active or resumable story-lead attempts
  - When: Caller invokes `story-orchestrate run`
  - Then: Runtime reports candidate attempts instead of guessing silently

**AC-2.4:** Story-lead artifacts preserve current state, append-only history, and terminal output.

- **TC-2.4a: Current snapshot exists**
  - Given: A story-lead attempt is running
  - When: Runtime writes current state
  - Then: A current snapshot artifact contains the latest story-run state
- **TC-2.4b: Event history exists**
  - Given: A story-lead attempt performs multiple steps
  - When: Runtime records progress
  - Then: An append-only event history records each event without replacing prior events
- **TC-2.4c: Terminal final package exists**
  - Given: A story-lead attempt reaches a terminal outcome
  - When: Runtime finalizes the attempt
  - Then: A terminal final package artifact contains the story-lead result

**AC-2.5:** `status` can recover by story id when story run id is missing.

- **TC-2.5a: Single attempt selected**
  - Given: A story has one prior story-lead attempt
  - When: Caller invokes `story-orchestrate status --story-id <id>` without story run id
  - Then: Runtime returns status for that attempt
- **TC-2.5b: Ambiguous attempts reported**
  - Given: A story has multiple plausible active or resumable story-lead attempts
  - When: Caller invokes status without story run id
  - Then: Runtime reports candidate attempts instead of guessing silently
- **TC-2.5c: Accepted attempt visible**
  - Given: A story has a prior accepted story-lead attempt
  - When: Caller invokes status by story id
  - Then: Runtime reports the accepted attempt and final package reference

**AC-2.7:** Story orchestration emits caller-facing heartbeats while active.

- **TC-2.7a: Story heartbeat emitted**
  - Given: `story-orchestrate run` remains active beyond the story heartbeat cadence
  - When: The cadence interval elapses
  - Then: Runtime emits a heartbeat with story id, story run id, current story-lead phase, elapsed time, current snapshot reference, and next poll recommendation
- **TC-2.7b: Story heartbeat uses 10 minute default**
  - Given: No story heartbeat override is present
  - When: Story heartbeat scheduling is initialized
  - Then: The default cadence is 10 minutes

**AC-2.8:** Story orchestration output includes a terminal completion marker.

- **TC-2.8a: Terminal output identifies final package**
  - Given: A story-lead attempt reaches a terminal outcome
  - When: The attached `story-orchestrate` command finishes
  - Then: The caller-visible output includes the terminal outcome, story run id, and final package artifact reference
- **TC-2.8b: Terminal marker distinguishes incomplete runs**
  - Given: The attached command is interrupted before a final package is written
  - When: Caller later reads story-lead status
  - Then: The status distinguishes incomplete/interrupted state from a terminal final package

**AC-2.10:** Story-lead state can recover after crash, context exhaustion, or process interruption.

- **TC-2.10a: Interrupted attempt discoverable**
  - Given: A story-lead process stops before writing a terminal final package
  - When: Caller invokes status by story id
  - Then: Runtime reports the incomplete attempt and the latest durable checkpoint
- **TC-2.10b: Context-window failure recorded**
  - Given: Story-lead or a child provider fails due to context/window limits
  - When: Runtime records the failure
  - Then: Current state or event history records the failure and the artifact-based recovery boundary

**AC-5.3:** A fresh-agent gorilla test verifies story-id recovery.

- **TC-5.3a: Lost story run id recovery**
  - Given: A story has prior story-lead artifacts and the agent is not given the story run id
  - When: The agent is asked to recover by spec-pack root and story id
  - Then: The test transcript or evidence log shows the agent locates the story-lead attempt through `story-orchestrate status` or `run` orientation behavior

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
**Relevant Data Contracts**

**CLI Commands**

| Operation | Command | Description |
|-----------|---------|-------------|
| Run story-lead | `lbuild-impl story-orchestrate run --spec-pack-root <path> --story-id <id>` | Orients from disk and runs a story-lead for one story |
| Resume story-lead | `lbuild-impl story-orchestrate resume --spec-pack-root <path> --story-id <id> [--story-run-id <id>] [--review-request-file <path>] [--ruling-file <path>]` | Exposes resume/reopen entrypoint; review/ruling behavior is completed in Story 3 |
| Read story-lead status | `lbuild-impl story-orchestrate status --spec-pack-root <path> --story-id <id> [--story-run-id <id>]` | Reads durable story-lead status |

**Story-Orchestrate Caller-Visible Results**

| Command | Case | Required Caller-Visible Result |
|---------|------|--------------------------------|
| `run` | New story-lead attempt started | Story id, story run id, current snapshot reference, event history reference, attached progress stream, and eventual terminal marker |
| `run` | Prior primitive artifacts but no story-lead attempt | Same as new attempt, plus orientation summary listing existing primitive artifacts used as input |
| `run` | Prior accepted attempt exists | `existing-accepted-attempt` result with story id, story run id, final package reference, and suggested `status` or `resume` follow-up |
| `run` | Prior interrupted attempt exists | Result identifying the interrupted story run id, latest checkpoint, and explicit `resume` command to continue |
| `run` | Active attempt exists | `active-attempt-exists` result with active story run id and current snapshot reference |
| `run` / `status` | Ambiguous attempts exist | `ambiguous-story-run` result with candidate story run ids, statuses, updated times, and final package references when present |
| `run` / `resume` / `status` | Invalid story id | `invalid-story-id` result with the requested story id and no state mutation |
| `status` | Single attempt found | Story id, story run id, current status, current snapshot reference, latest event sequence, and final package reference when terminal |

**New Public Error / Decision Results**

| Result | Applies To | Description |
|--------|------------|-------------|
| `invalid-story-id` | `run`, `resume`, `status` | Story id is not in the spec-pack story inventory |
| `ambiguous-story-run` | `run`, `status` | More than one plausible attempt exists and the caller must choose |
| `existing-accepted-attempt` | `run` | A prior story-lead scoped accepted attempt exists |
| `active-attempt-exists` | `run` | A running attempt already exists and duplicate work is unsafe |

**Story-Lead Current Snapshot**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| storyRunId | string | yes | Durable story-lead attempt id |
| storyId | string | yes | Stable story id |
| attempt | integer | yes | Attempt number |
| status | enum | yes | `running`, `accepted`, `needs-ruling`, `blocked`, `interrupted`, or `failed` |
| currentSummary | string | yes | Short current-state summary |
| currentChildOperation | object/null | yes | Active primitive operation when one is running |
| latestArtifacts | array | yes | Latest known artifacts referenced by story-lead |
| latestContinuationHandles | object | yes | Latest retained implementor/verifier handles known to story-lead |
| nextIntent | object/null | yes | Story-lead's current intended next step, when known |
| updatedAt | timestamp | yes | Last status update |

**Story-Lead Event**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | timestamp | yes | Event write time |
| storyRunId | string | yes | Story-lead attempt id |
| type | string | yes | Event category such as `heartbeat`, `child-operation-started`, `child-operation-completed`, `review-received`, `ruling-requested`, `accepted`, `blocked`, `failed`, or `interrupted` |
| sequence | integer | yes | Monotonic event sequence number within the attempt |
| summary | string | yes | Human-readable event summary |
| artifact | string | no | Related artifact reference |
| data | object | no | Structured event-specific data |

**Story Progress Stream Contract**

| Concern | Requirement |
|---------|-------------|
| Correlation | Every caller-visible story progress or heartbeat message identifies the story id and story run id once known |
| Sequencing | Events in durable history carry monotonic sequence numbers; attached output preserves event order as observed by the caller |
| Append semantics | Durable event history is append-only; current snapshot is overwritten with latest state |
| Completion marker | Attached output includes a terminal marker with final outcome and final package artifact reference |
| Error path | Interrupted or failed runs remain discoverable by story id and include the latest durable checkpoint |

**Terminal Story-Lead Result Scaffold**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| outcome | enum | yes | `accepted`, `needs-ruling`, `blocked`, `failed`, or `interrupted` |
| storyRunId | string | yes | Story-lead attempt id |
| storyId | string | yes | Story id |
| attempt | integer | yes | Attempt number |

Story 2 owns creation, persistence, and caller-visible reference of the terminal final-package artifact. Story 3 owns the full acceptance-package content and handoff semantics inside that artifact.

See `../tech-design.md`, `../tech-design-invocation-surface.md`, `../tech-design-story-runtime.md`, and `../test-plan.md` for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- [ ] `story-orchestrate run`, `resume`, and `status` command surfaces behave deterministically against existing story artifacts
- [ ] Story-run current snapshot, event history, and terminal package artifacts are persisted correctly
- [ ] Story-level heartbeats and terminal markers are visible to attached callers
- [ ] Story-id recovery works without a story run id
- [ ] `verify`, package tests, and recovery-focused tests pass
