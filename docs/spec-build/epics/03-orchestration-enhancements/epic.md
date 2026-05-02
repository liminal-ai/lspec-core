# Epic: Orchestration Enhancements

This epic defines requirements for long-running `lbuild-impl` orchestration. Existing provider-backed commands emit caller-facing heartbeat guidance. A new story-level operation runs one story through implementation, self-review, verification, fix routing, gate evidence, story-lead scoped acceptance, and impl-lead review handoff.

---

## Onboarding Context

`lbuild-impl` runs implementation operations for Liminal Spec packs. A spec pack contains an epic, tech design, test plan, and story files. Existing public operations are bounded primitives: `inspect`, `preflight`, `story-implement`, `story-continue`, `story-self-review`, `story-verify`, `quick-fix`, `epic-cleanup`, `epic-verify`, and `epic-synthesize`.

The live agent that calls `lbuild-impl` is the caller. The caller may be running in Codex, Claude Code, or another host. The caller harness is separate from the provider harness that runs child work. A command can be read by a Codex caller while launching a Claude Code provider, or read by a Claude Code caller while launching a Codex provider.

This epic introduces two role names:

- `impl-lead` - the outer implementation lead that chooses stories, launches story-level orchestration, reviews story output, accepts or reopens stories at the run level, records final story acceptance in `team-impl-log.md`, and controls progression between stories.
- `story-lead` - the story-level agent launched by `story-orchestrate`; it owns one story until it returns story-lead scoped `accepted`, `needs-ruling`, `blocked`, `failed`, or `interrupted`.

The CLI remains a bounded runtime surface. A story-level operation can keep internal state while running, but the broader CLI does not become a global workflow state machine. Durable state lives in artifacts beside the spec pack and feeds the existing `team-impl-log.md` recovery surface.

---

## User Profile

**Primary User:** Liminal Spec implementation maintainer or orchestration agent running `lbuild-impl` against a spec pack
**Context:** Long-running provider-backed operations and story implementation loops currently require the live caller to remember polling, interpret progress files, route repeated verification/fix cycles, preserve recovery state across compaction or restart, and keep `team-impl-log.md` aligned with the actual story state.
**Mental Model:** "I want to give the runtime one story, let a story-lead drive that story to a story-lead scoped result, and receive enough durable evidence for the impl-lead to accept, reject, reopen, commit, and update the run log."
**Key Constraint:** The runtime must preserve existing primitive operations, exact JSON stdout contracts, and the `team-impl-log.md` recovery model. Story-level orchestration adds a composed operation without turning the whole CLI into hidden global state.

### Secondary Consumers

The Tech Lead uses this epic to design CLI/SDK contracts and runtime artifacts. The `ls-impl` skill maintainer uses it to update process guidance required by the changed runtime behavior. Release maintainers use the story and test breakdown to confirm package documentation and gorilla evidence before publishing.

---

## Feature Overview

Existing provider-backed commands emit heartbeat reminders while they run. Heartbeats identify the active command, current progress signal, status artifact, and caller-specific next polling action. The heartbeat language addresses the caller harness reading the command output, not the provider harness doing implementation work. For Codex callers, the heartbeat repeats the exec-session polling action so the instruction stays visible during long-running work.

`story-orchestrate` runs a story-lead for one story. The stable recovery anchor is `spec-pack-root + story-id`; a story run id identifies one attempt. The story-lead writes current state, append-only event history, and a terminal final package. The final package feeds impl-lead review, `team-impl-log.md` updates, story receipt creation, commit gating, cleanup handoff, and story progression.

The story-lead state is intentionally richer than the first implementation requires. Future versions may rehydrate a fresh story-lead turn from the durable ledger after every child operation. This epic does not implement that fresh-turn loop, but the v1 artifacts must contain the continuity fields needed by that later design.

### Flow Summary

- [Caller Heartbeats for Primitive Operations](#1-caller-heartbeats-for-primitive-operations) - Existing long-running commands remind Codex, Claude Code, and generic callers how to keep monitoring active work. AC: `AC-1.1-AC-1.7`
- [Story-Lead Run Lifecycle](#2-story-lead-run-lifecycle) - `story-orchestrate run`, `resume`, and `status` manage one story-level attempt using story id as the stable recovery anchor. AC: `AC-2.1-AC-2.10`
- [Story-Lead Acceptance and Impl-Lead Handoff](#3-story-lead-acceptance-and-impl-lead-handoff) - Story-lead output includes evidence, gates, findings, deviations, risks, scope changes, shim/mock/fallback decisions, log-update inputs, cleanup inputs, and impl-lead recommendations. AC: `AC-3.1-AC-3.11`
- [Skill and Process Alignment](#4-skill-and-process-alignment) - `ls-impl` documentation reflects caller harnesses, host-specific monitoring, story-lead boundaries, story-id recovery, and observed recovery lessons. AC: `AC-4.1-AC-4.7`
- [Validation Requirements](#5-validation-requirements) - Unit, package, and gorilla evidence verify the runtime behavior and agent usability. AC: `AC-5.1-AC-5.4`

---

## Scope

### In Scope

- Default-on heartbeat reminders for existing provider-backed primitive commands
- Caller-harness-aware heartbeat language for Codex, Claude Code, and generic callers
- CLI, SDK, and run-config support for caller harness and heartbeat cadence
- Preservation of exact final JSON stdout for existing `--json` commands
- Heartbeat output that does not flood per provider output event
- A new `story-orchestrate` command group with `run`, `resume`, and `status`
- Story-lead current state, append-only events, and terminal final package artifacts
- Story id recovery when the caller loses the story run id
- Clear handling for invalid story ids and ambiguous story-lead attempts
- Story-lead progress and terminal completion output visible to attached callers
- Story-lead final package contract with acceptance evidence
- Structured risk/deviation/scope/shim records with description, reasoning, evidence, and approval status
- Structured impl-lead review request and caller ruling request contracts
- Story-lead output that feeds `team-impl-log.md`, story receipts, continuation handles, cumulative baselines, cleanup inputs, and impl-lead acceptance
- Impl-lead review/reopen input for story-lead remediation
- Targeted `ls-impl` skill updates required by the changed process
- Obvious skill corrections already identified from implementation logs
- Tests for heartbeat channels, cadence, caller wording, story-run lookup, final package validation, log handoff, cleanup handoff, and resume/reopen behavior
- Gorilla tests that check whether fresh agents follow heartbeat and story-lead guidance
- README/changelog/release notes updates that document the shipped operational behavior

### Out of Scope

- Full `impl-lead` whole-epic orchestration
- `epic-verify-orchestrate`
- Detached daemon or full process-supervisor lifecycle unless tech design finds a small safe subset
- App server or database persistence; JSON contracts should remain suitable for later migration
- A deterministic workflow state machine that governs story-lead choices
- Removal of existing primitive commands
- Requiring Claude Code as the only story-lead provider
- Automatic human interaction inside story-lead; story-lead requests a caller ruling
- Broad iterative `ls-impl` skill refinement, trigger tuning, or methodology rewrite
- Future fresh-turn story-lead loop where every agent turn exits after one decision
- Production release without gorilla evidence that caller heartbeat behavior is understandable

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Primitive provider-backed commands can emit heartbeat text outside stdout without breaking JSON stdout consumers | Unvalidated | Tech Lead | Current docs reserve stdout for exact JSON and stderr for progress/debug output |
| A2 | `story-orchestrate` can expose attached progress/heartbeat output from its first release | Unvalidated | Tech Lead | Exact protocol belongs in Tech Design |
| A3 | Story id is stable across story-lead attempts | Validated | Maintainer | Story files already use stable story ids in spec packs |
| A4 | Story-lead provider should be configurable | Validated | Maintainer | Codex story-lead should be testable; Claude Code should not be baked into the contract |
| A5 | Existing primitive operations remain valid building blocks for story-level orchestration | Validated | Maintainer | Story-lead composes them through SDK/library surfaces |
| A6 | `team-impl-log.md` remains the run-level recovery surface | Validated | Maintainer | Current skill docs define this contract; story-lead artifacts feed the log rather than replacing it |

### Size Decision

This epic intentionally exceeds the normal size checkpoint because caller heartbeats and story-lead orchestration share caller-harness vocabulary, progress semantics, run-config surfaces, and skill updates. The natural split would be primitive heartbeats versus story-lead orchestration; this draft keeps them together so Tech Design can define one coherent orchestration contract. Tech Design should preserve the heartbeat/story-lead separation in chunks and stories.

### Approved Target Defaults

| ID | Default | Owner | Notes |
|----|---------|-------|-------|
| D1 | Primitive heartbeat cadence is 5 minutes | Maintainer | Override supported through config or CLI flag |
| D2 | Story orchestration heartbeat cadence is 10 minutes | Maintainer | Long story runs commonly take 30-45 minutes and may take up to 2 hours |
| D3 | Existing primitive `--json` commands keep stdout as exact final JSON | Maintainer | Primitive heartbeats use stderr in every primitive output mode |
| D4 | `story-orchestrate run` orients from existing story artifacts before deciding whether work is new, partial, or conflicting | Maintainer | `run` is not blind "start from zero" and does not silently continue prior story-lead attempts |
| D5 | Story-lead durable state uses a current snapshot, append-only event history, and terminal final package | Maintainer | Current state and history remain separate |
| D6 | Story-lead scoped acceptance does not equal impl-lead acceptance | Maintainer | Impl-lead still reviews, records receipt, commits, and advances |

---

## Flows & Requirements

### 1. Caller Heartbeats for Primitive Operations

Provider-backed primitive commands can run long enough that the live caller forgets to poll, sends a final response while work is active, or loses the execution loop after context compaction. Heartbeats make the running command remind the caller what to do next without changing the operation's final envelope.

Heartbeat guidance is based on the caller harness, not the provider role launched by the command. A Codex caller receives instructions for polling the same running exec session. A Claude Code caller receives Monitor-aware guidance. A generic caller receives attached-process and status-file guidance.

The heartbeat-applicable primitive commands are `story-implement`, `story-continue`, `story-self-review`, `story-verify`, `quick-fix`, `epic-cleanup`, `epic-verify`, and `epic-synthesize`.

1. Caller runs a provider-backed primitive command.
2. Runtime starts provider work and writes normal progress artifacts.
3. Runtime emits fixed-cadence heartbeat reminders while work remains active.
4. Caller polls or monitors according to the heartbeat guidance.
5. Runtime emits the same final envelope contract it emits today.

#### Acceptance Criteria

**AC-1.1:** Provider-backed primitive commands emit heartbeat reminders while active.

- **TC-1.1a: Primitive heartbeat emitted**
  - Given: A provider-backed primitive command is running longer than its configured heartbeat cadence
  - When: The cadence interval elapses
  - Then: The command emits a heartbeat containing command name, elapsed time, status artifact reference, latest progress summary, and next poll recommendation
- **TC-1.1b: Short command has no required heartbeat**
  - Given: A provider-backed primitive command finishes before the cadence interval
  - When: The command exits
  - Then: The final envelope is emitted normally and no heartbeat is required

**AC-1.2:** Primitive heartbeat output does not break exact JSON stdout consumers.

- **TC-1.2a: JSON stdout remains exact**
  - Given: A primitive command is invoked with `--json`
  - When: Heartbeats are emitted and the command completes
  - Then: stdout contains only the final JSON envelope and heartbeat text appears on stderr
- **TC-1.2b: JSON parser compatibility**
  - Given: A script parses stdout from a primitive `--json` command
  - When: Heartbeats occur during command execution
  - Then: The script can parse stdout as a single JSON object without filtering heartbeat messages

**AC-1.3:** Primitive heartbeats use stderr for all primitive output modes.

- **TC-1.3a: Non-JSON heartbeat channel**
  - Given: A primitive command is invoked without `--json`
  - When: Heartbeats are emitted
  - Then: Heartbeat messages are emitted on stderr and do not alter the command's normal stdout summary behavior

**AC-1.4:** Heartbeat guidance is tailored to the caller harness.

- **TC-1.4a: Codex caller guidance**
  - Given: Caller harness is `codex`
  - When: A heartbeat is emitted
  - Then: The heartbeat instructs the caller to poll the same running exec session with empty input and not final while status is running
- **TC-1.4b: Claude Code caller guidance**
  - Given: Caller harness is `claude-code`
  - When: A heartbeat is emitted
  - Then: The heartbeat says to use Monitor if available or keep monitoring the attached command until it exits
- **TC-1.4c: Generic caller guidance**
  - Given: Caller harness is not specified
  - When: A heartbeat is emitted
  - Then: The heartbeat gives generic attached-process and status-file monitoring guidance

**AC-1.5:** Heartbeat cadence is configurable through CLI, SDK, and run config surfaces.

Override precedence is: explicit CLI flag for CLI callers, explicit SDK operation input for SDK callers, run config value, then default cadence.

- **TC-1.5a: Primitive default cadence**
  - Given: A primitive provider-backed command runs without a cadence override
  - When: Heartbeat scheduling is initialized
  - Then: The default cadence is 5 minutes
- **TC-1.5b: CLI cadence override**
  - Given: A primitive command includes a heartbeat cadence override
  - When: Heartbeat scheduling is initialized
  - Then: The override value controls heartbeat timing
- **TC-1.5c: Run config cadence**
  - Given: The run config defines a caller harness and heartbeat cadence
  - When: A provider-backed command runs without command-line overrides
  - Then: The command uses the configured caller harness and cadence
- **TC-1.5d: SDK cadence input**
  - Given: An SDK caller supplies caller harness and heartbeat cadence options
  - When: The SDK operation runs provider-backed work
  - Then: Heartbeats use the SDK-provided caller harness and cadence unless the operation receives a more specific override

**AC-1.6:** Heartbeats summarize fixed-cadence state rather than every provider output event.

- **TC-1.6a: No output flood**
  - Given: A provider emits frequent stdout/stderr output
  - When: The command runs across multiple provider output events
  - Then: Heartbeats remain fixed-cadence summaries rather than one message per provider output event
- **TC-1.6b: Silence summary**
  - Given: A provider is silent but has not crossed configured stall thresholds
  - When: A heartbeat interval elapses
  - Then: The heartbeat reports the silence duration and the next poll recommendation without declaring final failure

**AC-1.7:** Heartbeat behavior can be disabled for callers that need silent execution.

- **TC-1.7a: Heartbeat disabled**
  - Given: A provider-backed primitive command is invoked with heartbeat disabled
  - When: The command runs longer than the default cadence
  - Then: No heartbeat messages are emitted and final envelope behavior is unchanged

### 2. Story-Lead Run Lifecycle

`story-orchestrate` gives the caller one story-level operation to run instead of a manual sequence of implementation, self-review, verification, fix routing, and gate steps. The story-lead owns the internal story loop and returns a story-level terminal result. The impl-lead reviews the result after the operation completes.

The stable recovery anchor is `spec-pack-root + story-id`. A story run id identifies a specific story-lead attempt, but it is not the only way to recover. If the caller loses the story run id, the runtime can inspect the story's artifact directory and find prior story-lead attempts.

`run` means "run the story-lead for this story after orienting from disk." It starts the first attempt when no prior story-lead state exists. It starts a story-lead from prior primitive artifacts when no story-lead attempt exists yet. If a prior story-lead attempt exists, `run` reports the existing attempt and the required follow-up command instead of continuing it. `resume` means "continue or reopen a known prior attempt," especially with impl-lead review input.

1. Caller runs `story-orchestrate run` for a story.
2. Runtime validates the story id against the spec-pack story inventory.
3. Runtime inspects existing primitive story artifacts and prior story-lead attempts.
4. Runtime starts a new story-lead attempt when appropriate or reports the required follow-up command for an existing attempt.
5. Story-lead runs until it returns `accepted`, `needs-ruling`, `blocked`, `failed`, or `interrupted`.
6. Runtime writes current state, event history, and terminal final package artifacts.
7. Runtime emits attached progress, heartbeat, and terminal completion output while the command is running.
8. Caller reviews the final package and performs impl-lead acceptance, rejection, or reopen.

#### Acceptance Criteria

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

**AC-2.2:** Story id validation prevents silent work on the wrong story.

- **TC-2.2a: Valid story id accepted**
  - Given: A story id exists in the spec-pack story inventory
  - When: Caller invokes `story-orchestrate run` with that story id
  - Then: Runtime orients the story-lead against that story
- **TC-2.2b: Invalid story id rejected**
  - Given: A story id does not exist in the spec-pack story inventory
  - When: Caller invokes `story-orchestrate run`, `resume`, or `status` with that story id
  - Then: Runtime returns a clear invalid-story result and does not create or mutate story-lead state

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

**AC-2.6:** `resume` accepts impl-lead review input for reopening story-lead work.

- **TC-2.6a: Resume with review request**
  - Given: A story-lead attempt produced a final package and impl-lead rejected it
  - When: Caller invokes `story-orchestrate resume` with a review request file
  - Then: Runtime gives the review request to story-lead as caller input for remediation
- **TC-2.6b: Review request preserved**
  - Given: A resume call includes a review request
  - When: Runtime records the resumed attempt
  - Then: The review request is referenced in current state, event history, and final package evidence
- **TC-2.6c: Invalid review request rejected**
  - Given: A review request file is missing, unreadable, or schema-incompatible
  - When: Caller invokes `story-orchestrate resume` with that file
  - Then: Runtime returns a clear invalid-review-request result and does not resume story-lead work

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

**AC-2.9:** Story-lead provider is configurable and not hard-coded to Claude Code.

- **TC-2.9a: Configured story-lead provider**
  - Given: The run config selects a story-lead provider/model
  - When: `story-orchestrate run` starts
  - Then: Runtime launches the configured provider/model for story-lead
- **TC-2.9b: Codex story-lead testable**
  - Given: The run config selects Codex as story-lead provider
  - When: A mocked-provider package test runs
  - Then: Runtime routes story-lead through the Codex provider adapter without Claude Code-specific assumptions

**AC-2.10:** Story-lead state can recover after crash, context exhaustion, or process interruption.

- **TC-2.10a: Interrupted attempt discoverable**
  - Given: A story-lead process stops before writing a terminal final package
  - When: Caller invokes status by story id
  - Then: Runtime reports the incomplete attempt and the latest durable checkpoint
- **TC-2.10b: Context-window failure recorded**
  - Given: Story-lead or a child provider fails due to context/window limits
  - When: Runtime records the failure
  - Then: Current state or event history records the failure and the artifact-based recovery boundary

### 3. Story-Lead Acceptance and Impl-Lead Handoff

The story-lead returns a story-lead scoped terminal outcome. `accepted` means the story-lead believes the story is complete within its authority. It does not mean the story has advanced at the run level. The impl-lead reviews the final package, updates `team-impl-log.md`, records the story receipt, verifies commit status, accepts or rejects the story at the run level, and advances the run.

The final package records every deviation, risk, scope change, and shim/mock/fallback decision in explicit arrays. Empty arrays are allowed. Non-empty items include what happened, why story-lead believes the item is acceptable or blocked, supporting evidence, and approval status.

Story-lead final output also preserves the existing cleanup handoff. Findings with `defer` or `accepted-risk` dispositions remain visible so the impl-lead can later compile the cleanup batch required before epic verification.

#### Acceptance Criteria

**AC-3.1:** Every terminal story-lead result includes a complete final package.

- **TC-3.1a: Final package fields present**
  - Given: A story-lead attempt reaches a terminal outcome
  - When: A reviewer reads the terminal final package
  - Then: It includes story id, story run id, attempt, outcome, summary, evidence, verification, risk and deviation review, diff review, acceptance checks, log handoff, cleanup handoff, ruling request if applicable, and recommended impl-lead action
- **TC-3.1b: Arrays present when empty**
  - Given: A story has no deviations, risks, scope changes, or shim/mock/fallback decisions
  - When: A reviewer reads the risk and deviation review
  - Then: Each category appears as an empty array rather than being omitted

**AC-3.2:** Risk and deviation items include description, reasoning, evidence, and approval status.

- **TC-3.2a: Spec deviation item structure**
  - Given: Story-lead reports a spec deviation
  - When: The final package is validated
  - Then: The spec deviation item includes `description`, `reasoning`, `evidence`, and `approvalStatus`
- **TC-3.2b: Assumed risk item structure**
  - Given: Story-lead reports an assumed risk
  - When: The final package is validated
  - Then: The risk item includes `description`, `reasoning`, `evidence`, and `approvalStatus`
- **TC-3.2c: Scope change item structure**
  - Given: Story-lead reports a scope change
  - When: The final package is validated
  - Then: The scope change item includes `description`, `reasoning`, `evidence`, and `approvalStatus`
- **TC-3.2d: Shim/mock/fallback item structure**
  - Given: Story-lead reports a shim, mock, fake, fallback, or test-only path decision
  - When: The final package is validated
  - Then: The item includes `description`, `reasoning`, `evidence`, and `approvalStatus`

**AC-3.3:** Story-lead acceptance checks are explicit and evidence-backed.

- **TC-3.3a: Required checks listed**
  - Given: Story-lead returns `accepted`
  - When: A reviewer reads the final package
  - Then: Acceptance checks include story gate result, final verifier result, unresolved findings status, scope change status, shim/mock/fallback status, baseline status, receipt readiness, and commit readiness
- **TC-3.3b: Check evidence present**
  - Given: Story-lead returns `accepted`
  - When: A reviewer reads each acceptance check
  - Then: Each check includes status, evidence, and reasoning
- **TC-3.3c: Failed check prevents accepted outcome**
  - Given: A required acceptance check is false or unknown
  - When: Story-lead finalizes the story
  - Then: The outcome is not `accepted`

**AC-3.4:** Story-lead requests a caller ruling for authority-boundary decisions.

- **TC-3.4a: Scope change requires ruling**
  - Given: Completing a story requires work outside the story's ACs/TCs or design shard
  - When: Story-lead reaches that decision
  - Then: Story-lead returns or records a ruling request instead of accepting silently
- **TC-3.4b: Spec ambiguity requires ruling**
  - Given: Two plausible spec interpretations would change implementation behavior
  - When: Story-lead cannot resolve the ambiguity from the epic, tech design, test plan, or story
  - Then: Story-lead requests a caller ruling
- **TC-3.4c: Intentional deviation requires ruling**
  - Given: Story-lead believes the story should intentionally deviate from the spec or tech design
  - When: That deviation affects behavior, verification, scope, or risk
  - Then: Story-lead requests a caller ruling
- **TC-3.4d: Production shim requires ruling**
  - Given: Story-lead would introduce or expand a production shim, mock, fake, fallback, temporary replacement path, or test-only path
  - When: Story-lead reaches that decision
  - Then: Story-lead requests a caller ruling unless explicit prior approval exists
- **TC-3.4e: Gate lowering requires ruling**
  - Given: Story completion would require skipping or lowering a configured verification gate
  - When: Story-lead reaches that decision
  - Then: Story-lead requests a caller ruling
- **TC-3.4f: Baseline drop requires ruling**
  - Given: Current test baseline is lower than the prior accepted baseline
  - When: Story-lead reaches acceptance review
  - Then: Story-lead does not accept and requests remediation or caller ruling
- **TC-3.4g: Provider failure with incomplete evidence requires ruling**
  - Given: Provider failure leaves verification diversity or required evidence incomplete
  - When: Story-lead cannot recover the missing evidence safely
  - Then: Story-lead requests a caller ruling or returns `blocked`
- **TC-3.4h: Repeated unresolved finding requires ruling**
  - Given: The same material finding remains unresolved after bounded attempts
  - When: Story-lead reaches the configured retry boundary
  - Then: Story-lead requests a caller ruling or returns `blocked`
- **TC-3.4i: Verifier blocker cannot be self-dismissed**
  - Given: A verifier reports a blocking finding
  - When: Story-lead believes the finding is non-blocking
  - Then: Story-lead cites concrete spec/design evidence or requests a caller ruling

**AC-3.5:** Story-lead evidence references all child operations used to reach the result.

- **TC-3.5a: Implementor evidence referenced**
  - Given: Story-lead launches implementation or continuation
  - When: It returns a final package
  - Then: The final package references each implementor artifact used for story-lead scoped acceptance
- **TC-3.5b: Self-review evidence referenced**
  - Given: Story-lead runs self-review
  - When: It returns a final package
  - Then: The final package references the self-review batch artifact
- **TC-3.5c: Verification evidence referenced**
  - Given: Story-lead runs verification
  - When: It returns a final package
  - Then: The final package references every verifier artifact used for final disposition
- **TC-3.5d: Fix evidence referenced**
  - Given: Story-lead uses quick-fix or follow-up implementation
  - When: It returns a final package
  - Then: The final package references those fix artifacts

**AC-3.6:** Story-lead final output feeds `team-impl-log.md`.

- **TC-3.6a: Log handoff fields present**
  - Given: Story-lead returns a terminal final package
  - When: Impl-lead reviews it
  - Then: The package includes the story id, next run state recommendation, current phase recommendation, continuation handles, artifact references, cumulative baseline data, and story receipt draft needed to update `team-impl-log.md`
- **TC-3.6b: Continuation handles preserved**
  - Given: Story-lead uses retained implementor or verifier sessions
  - When: It returns a final package
  - Then: The log handoff includes the latest continuation handles and their source artifacts

**AC-3.7:** Story-lead final output preserves story receipt and commit requirements.

- **TC-3.7a: Receipt draft complete**
  - Given: Story-lead returns `accepted`
  - When: Impl-lead reviews the final package
  - Then: The package includes a complete story receipt draft with implementor evidence, verifier evidence, story gate result, finding dispositions, open risks, and baseline before/after
- **TC-3.7b: Commit readiness explicit**
  - Given: Story-lead returns `accepted`
  - When: Impl-lead reviews the final package
  - Then: The package states whether changes are committed, uncommitted but ready for impl-lead commit, or not ready to commit
- **TC-3.7c: Receipt and commit blockers surfaced**
  - Given: Story-lead returns `accepted`
  - When: The receipt is incomplete or the required story commit has not landed
  - Then: The final package marks impl-lead acceptance as blocked until receipt and commit requirements are satisfied

**AC-3.8:** Story-lead output distinguishes story-lead scoped acceptance from impl-lead acceptance.

- **TC-3.8a: Scoped acceptance wording**
  - Given: Story-lead returns `accepted`
  - When: A reviewer reads the final package
  - Then: The package makes clear that acceptance is story-lead scoped and recommends an impl-lead action

**AC-3.9:** Impl-lead can reject or reopen a story-lead accepted result.

- **TC-3.9a: Rejection recorded**
  - Given: Story-lead returns accepted and impl-lead rejects it
  - When: Caller resumes with a review request
  - Then: The story-lead ledger records the impl-lead review and the next attempt addresses it
- **TC-3.9b: Multiple accepted attempts retained**
  - Given: Story-lead accepted attempt 1, impl-lead rejected it, and story-lead accepted attempt 2
  - When: A reviewer inspects the story-lead artifacts
  - Then: Both attempts remain distinguishable and linked by review history

**AC-3.10:** Story-lead output preserves cleanup handoff.

- **TC-3.10a: Accepted-risk items exported**
  - Given: Story-lead accepts a story with accepted-risk dispositions
  - When: Impl-lead reviews the final package
  - Then: The cleanup handoff lists the accepted-risk items for later cleanup review
- **TC-3.10b: Deferred items exported**
  - Given: Story-lead accepts a story with deferred dispositions
  - When: Impl-lead reviews the final package
  - Then: The cleanup handoff lists the deferred items for later cleanup review
- **TC-3.10c: No cleanup items explicit**
  - Given: Story-lead accepts a story with no defer or accepted-risk dispositions
  - When: Impl-lead reviews the final package
  - Then: The cleanup handoff states that no cleanup items were carried from the story

**AC-3.11:** Story-lead recovery preserves smallest-safe-step replay.

AC-2.10 covers whether an interrupted or context-exhausted story-lead attempt is discoverable. AC-3.11 covers whether the final package or ledger identifies the smallest safe replay boundary after such a failure.

- **TC-3.11a: Provider output invalid recovery hint**
  - Given: A child operation fails with invalid provider output but valid pass artifacts exist
  - When: Story-lead records the failure
  - Then: The ledger identifies valid artifacts and the smallest safe replay step
- **TC-3.11b: Context-window failure recovery hint**
  - Given: A retained provider session fails due to context/window limits
  - When: Story-lead records the failure
  - Then: The ledger identifies whether fresh story-lead or fresh child-provider rehydration is required from artifacts

### 4. Skill and Process Alignment

The CLI behavior changes how agents should run `lbuild-impl`. The CLI-delivered `ls-impl` skill must describe the new process accurately without broad iterative skill refinement. The skill should stop describing orchestration as always inside Claude Code, separate caller host from provider harness, and teach heartbeat-driven monitoring.

This flow includes only skill updates required by process changes and observed implementation-log learnings.

#### Targeted Skill Updates

| Update | Reason |
|--------|--------|
| Caller/provider terminology | Current skill treats Claude Code as the primary harness and conflates caller host with provider harness |
| Monitor distinction | Monitor is Claude-Code-host-specific and not available in Codex |
| Heartbeat monitoring | New CLI output gives host-tailored polling reminders |
| Story-lead / impl-lead boundary | New story-level operation changes acceptance and handoff vocabulary |
| Story-id recovery | Story runs can be recovered by `spec-pack-root + story-id` when story run id is lost |
| Smallest-step replay | Implementation logs show valid artifacts should be trusted and only missing bounded work replayed |
| Retained-context caution | Implementation logs show large retained provider context and gate output can make fresh rehydration safer |
| Log/receipt/commit preservation | Story-lead output feeds existing run log and commit-based acceptance rules |
| Cleanup handoff preservation | Deferred and accepted-risk story items still feed cleanup before epic verification |

#### Acceptance Criteria

**AC-4.1:** `ls-impl` uses generic live-orchestrator language rather than Claude-Code-only framing.

- **TC-4.1a: Root skill description updated**
  - Given: A caller loads `lbuild-impl skill ls-impl`
  - When: The root skill text is rendered
  - Then: It describes a generic live orchestrator/caller and does not state that orchestration always runs inside Claude Code
- **TC-4.1b: Claude Code references scoped**
  - Given: The skill mentions Claude Code
  - When: A reviewer reads the surrounding section
  - Then: The reference is explicitly provider-specific or host-tool-specific

**AC-4.2:** The skill distinguishes caller harness from provider harness.

- **TC-4.2a: Caller harness definition**
  - Given: The skill terminology section is loaded
  - When: A reviewer reads the caller/provider definitions
  - Then: The skill defines caller harness as the host reading CLI output and provider harness as the agent runtime used for child work
- **TC-4.2b: Heartbeat examples use caller harness**
  - Given: The skill documents heartbeat behavior
  - When: Examples mention Codex or Claude Code
  - Then: They refer to the caller receiving output, not necessarily the provider doing implementation

**AC-4.3:** The skill teaches heartbeat-driven monitoring.

- **TC-4.3a: Codex monitoring guidance**
  - Given: The skill's monitoring guidance is loaded
  - When: The caller host is Codex
  - Then: The guidance says to keep the exec session open, poll with empty input, follow heartbeat cadence, and avoid final while work is running
- **TC-4.3b: Claude Code Monitor guidance**
  - Given: The skill's monitoring guidance is loaded
  - When: The caller host is Claude Code
  - Then: The guidance says Monitor may be used when available and does not imply Monitor exists in Codex

**AC-4.4:** The skill documents story-lead and impl-lead boundaries.

- **TC-4.4a: Story-lead boundary**
  - Given: The skill describes story orchestration
  - When: A reviewer reads the story-lead section
  - Then: It says story-lead owns one story internally and returns a final package
- **TC-4.4b: Impl-lead boundary**
  - Given: The skill describes outer orchestration
  - When: A reviewer reads the impl-lead section
  - Then: It says impl-lead reviews, accepts, rejects, or reopens story-lead output

**AC-4.5:** The skill documents story-id recovery.

- **TC-4.5a: Recovery by story id**
  - Given: The skill describes recovery after lost context or lost story run id
  - When: A reviewer reads the recovery section
  - Then: It explains that `spec-pack-root + story-id` can locate prior story-lead attempts

**AC-4.6:** The skill preserves log, receipt, commit, and cleanup obligations.

- **TC-4.6a: Log handoff guidance**
  - Given: The skill describes story-lead output
  - When: A reviewer reads the impl-lead handoff section
  - Then: It explains how story-lead final packages feed `team-impl-log.md`, story receipts, cumulative baselines, continuation handles, and state transitions
- **TC-4.6b: Commit acceptance guidance**
  - Given: The skill describes impl-lead story acceptance
  - When: A reviewer reads acceptance guidance
  - Then: It says run-level story acceptance still requires receipt completion and the story commit
- **TC-4.6c: Cleanup handoff guidance**
  - Given: The skill describes accepted-risk or deferred story items
  - When: A reviewer reads closeout guidance
  - Then: It says those items feed the cleanup batch before epic verification

**AC-4.7:** The skill carries forward implementation-log learnings that affect process correctness.

- **TC-4.7a: Smallest-step replay**
  - Given: The skill describes provider output failures
  - When: A reviewer reads recovery guidance
  - Then: It says to trust valid persisted artifacts and replay only the smallest missing bounded step
- **TC-4.7b: Large retained context caution**
  - Given: The skill describes retained sessions
  - When: A reviewer reads provider failure guidance
  - Then: It notes that accumulated retained context and large gate output can make fresh rehydration safer than repeatedly resuming the same provider session

### 5. Validation Requirements

This feature changes agent behavior, so validation includes more than schema checks. A fresh agent must be able to read CLI output, follow heartbeat instructions, avoid closing while work is active, and recover story work from durable artifacts.

#### Acceptance Criteria

**AC-5.1:** Unit and package tests cover heartbeat and story-lead contracts.

- **TC-5.1a: Heartbeat contract tests**
  - Given: The test suite
  - When: Unit tests run
  - Then: Tests cover heartbeat rendering, caller wording, cadence defaults, overrides, disabled mode, stderr channel behavior, and JSON stdout preservation
- **TC-5.1b: Story-lead schema tests**
  - Given: The test suite
  - When: Unit tests run
  - Then: Tests validate story-lead current state, events, final package, review request, ruling request, acceptance checks, and risk/deviation item contracts
- **TC-5.1c: Package CLI tests**
  - Given: The built package
  - When: Package tests run against mocked providers
  - Then: Tests cover primitive heartbeat stderr behavior and `story-orchestrate run/resume/status`

**AC-5.2:** A fresh-agent gorilla test verifies heartbeat usability.

- **TC-5.2a: Fresh agent follows heartbeat**
  - Given: A fresh agent receives a task that runs a long provider-backed command
  - When: Heartbeat reminders are emitted
  - Then: The test transcript or evidence log shows the agent polls again, does not send final output while the operation is running, and records the final envelope after completion

**AC-5.3:** A fresh-agent gorilla test verifies story-id recovery.

- **TC-5.3a: Lost story run id recovery**
  - Given: A story has prior story-lead artifacts and the agent is not given the story run id
  - When: The agent is asked to recover by spec-pack root and story id
  - Then: The test transcript or evidence log shows the agent locates the story-lead attempt through `story-orchestrate status` or `run` orientation behavior

**AC-5.4:** Story-lead provider variants are tested before setting a default.

- **TC-5.4a: Claude Code story-lead smoke**
  - Given: Claude Code is configured as story-lead provider in a mocked or gated environment
  - When: Story orchestration runs
  - Then: The story-lead flow reaches a terminal test outcome and writes durable artifacts
- **TC-5.4b: Codex story-lead smoke**
  - Given: Codex is configured as story-lead provider in a mocked or gated environment
  - When: Story orchestration runs
  - Then: The story-lead flow reaches a terminal test outcome and writes durable artifacts

### Rollout Obligations

- README includes examples for `story-orchestrate run`, `resume`, and `status`.
- Release notes mention that primitive command heartbeats preserve JSON stdout compatibility.
- Story 4 completion requires updated docs that match the shipped command surface and caller guidance.

---

## Data Contracts

This section is intentionally detailed because this feature defines a public CLI/SDK/runtime contract surface. The tables below describe caller-visible and persisted boundary contracts, not internal implementation structure.

### CLI Commands

| Operation | Command | Description |
|-----------|---------|-------------|
| Run story-lead | `lbuild-impl story-orchestrate run --spec-pack-root <path> --story-id <id>` | Orients from disk and runs a story-lead for one story |
| Resume story-lead | `lbuild-impl story-orchestrate resume --spec-pack-root <path> --story-id <id> [--story-run-id <id>] [--review-request-file <path>] [--ruling-file <path>]` | Resumes or reopens a story-lead attempt |
| Read story-lead status | `lbuild-impl story-orchestrate status --spec-pack-root <path> --story-id <id> [--story-run-id <id>]` | Reads durable story-lead status |

### Story-Orchestrate Caller-Visible Results

| Command | Case | Required Caller-Visible Result |
|---------|------|--------------------------------|
| `run` | New story-lead attempt started | Story id, story run id, current snapshot reference, event history reference, attached progress stream, and eventual terminal marker |
| `run` | Prior primitive artifacts but no story-lead attempt | Same as new attempt, plus orientation summary listing existing primitive artifacts used as input |
| `run` | Prior accepted attempt exists | `existing-accepted-attempt` result with story id, story run id, final package reference, and suggested `status` or `resume` follow-up |
| `run` | Prior interrupted attempt exists | Result identifying the interrupted story run id, latest checkpoint, and explicit `resume` command to continue |
| `run` | Active attempt exists | `active-attempt-exists` result with active story run id and current snapshot reference |
| `run` / `status` | Ambiguous attempts exist | `ambiguous-story-run` result with candidate story run ids, statuses, updated times, and final package references when present |
| `run` / `resume` / `status` | Invalid story id | `invalid-story-id` result with the requested story id and no state mutation |
| `resume` | Review request accepted | Story id, story run id, accepted review request reference, current snapshot reference, attached progress stream, and eventual terminal marker |
| `resume` | Ruling accepted | Story id, story run id, accepted ruling reference, current snapshot reference, attached progress stream, and eventual terminal marker |
| `resume` | Invalid review request or ruling | `invalid-review-request` or `invalid-ruling` result with no state mutation |
| `status` | Single attempt found | Story id, story run id, current status, current snapshot reference, latest event sequence, and final package reference when terminal |

### New Public Error / Decision Results

| Result | Applies To | Description |
|--------|------------|-------------|
| `invalid-story-id` | `run`, `resume`, `status` | Story id is not in the spec-pack story inventory |
| `ambiguous-story-run` | `run`, `status` | More than one plausible attempt exists and the caller must choose |
| `existing-accepted-attempt` | `run` | A prior story-lead scoped accepted attempt exists |
| `active-attempt-exists` | `run` | A running attempt already exists and duplicate work is unsafe |
| `invalid-review-request` | `resume` | Review request file is missing, unreadable, or invalid |
| `invalid-ruling` | `resume` | Ruling file is missing, unreadable, or invalid |

Tech Design decides whether these appear as `outcome` values, typed errors, or structured result variants. The caller-visible behavior must distinguish each case without relying on message-text parsing.

### Outcome Vocabulary Compatibility

| Concept | Existing Runtime Vocabulary | Story-Lead Vocabulary | Requirement |
|---------|-----------------------------|-----------------------|-------------|
| Primitive caller decision needed | `needs-user-decision` status, `needs-human-ruling` outcome | n/a | Existing primitive operation vocabulary remains unchanged |
| Story-lead caller ruling needed | n/a | `needs-ruling` terminal outcome | Only `story-orchestrate` may introduce this composed-operation outcome, and it must be versioned or mapped without changing primitive outcomes |
| Story-lead scoped acceptance | none | `accepted` terminal outcome | This outcome applies only to story-lead final packages |
| Runtime blocked | `blocked` status / `block` outcome | `blocked` terminal outcome | Mapping must preserve current blocked/error semantics |

### Heartbeat Message

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command | string | yes | Running command name |
| storyId | string | no | Story id when command is story-scoped |
| storyRunId | string | no | Story-lead attempt id when applicable |
| elapsedTime | duration | yes | Elapsed command runtime |
| phase | string | yes | Current runtime phase or progress summary |
| lastOutputAt | timestamp or null | yes | Last provider output time when known |
| statusArtifact | string | yes | Reference to current status/current-snapshot artifact |
| nextPollRecommendation | object or string | yes | Caller-specific next monitoring action |
| callerHarness | string | yes | Caller harness used to tailor the reminder |

### Story-Lead Current Snapshot

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

### Story-Lead Event

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | timestamp | yes | Event write time |
| storyRunId | string | yes | Story-lead attempt id |
| type | string | yes | Event category such as `heartbeat`, `child-operation-started`, `child-operation-completed`, `review-received`, `ruling-requested`, `accepted`, `blocked`, `failed`, or `interrupted` |
| sequence | integer | yes | Monotonic event sequence number within the attempt |
| summary | string | yes | Human-readable event summary |
| artifact | string | no | Related artifact reference |
| data | object | no | Structured event-specific data |

### Story Progress Stream Contract

| Concern | Requirement |
|---------|-------------|
| Correlation | Every caller-visible story progress or heartbeat message identifies the story id and story run id once known |
| Sequencing | Events in durable history carry monotonic sequence numbers; attached output preserves event order as observed by the caller |
| Append semantics | Durable event history is append-only; current snapshot is overwritten with latest state |
| Completion marker | Attached output includes a terminal marker with final outcome and final package artifact reference |
| Error path | Interrupted or failed runs remain discoverable by story id and include the latest durable checkpoint |

### Impl-Lead Review Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | yes | `impl-lead`, `human`, `reviewer-agent`, or another caller authority |
| decision | enum | yes | `reject`, `reopen`, `revise`, `ask-ruling`, or `stop` |
| summary | string | yes | Short description of why the prior result was not accepted |
| items | array | yes | Review items story-lead must address |
| evidence | array | no | Artifact, spec, code, or log references |

### Impl-Lead Review Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Stable review item id |
| severity | enum | yes | `blocker`, `major`, `minor`, or `note` |
| concern | string | yes | Concern the story-lead must address |
| requiredResponse | string | yes | Expected story-lead response, fix, ruling request, or explanation |
| evidence | array | no | Artifact, spec, code, or log references |

### Caller Ruling Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Stable ruling request id |
| decisionType | string | yes | Scope change, spec ambiguity, spec deviation, accepted risk, shim/mock/fallback, gate change, provider failure, repeated failure, or other |
| question | string | yes | Decision needed from caller authority |
| defaultRecommendation | string | yes | Story-lead's recommended safe action |
| evidence | array | yes | Artifact, spec, code, or log references supporting the request |
| allowedResponses | array | yes | Allowed ruling responses |

### Caller Ruling Response

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| rulingRequestId | string | yes | Request id being answered |
| decision | string | yes | Caller decision selected from the allowed responses or a documented override |
| rationale | string | yes | Reasoning for the decision |
| source | string | yes | `impl-lead`, `human`, `reviewer-agent`, or another caller authority |

### Final Story-Lead Package

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| outcome | enum | yes | `accepted`, `needs-ruling`, `blocked`, `failed`, or `interrupted` |
| storyRunId | string | yes | Story-lead attempt id |
| storyId | string | yes | Story id |
| attempt | integer | yes | Attempt number |
| summary | object | yes | Story title, implemented scope, and story-lead acceptance rationale |
| evidence | object | yes | Implementor, self-review, verifier, quick-fix, and gate artifacts |
| verification | object | yes | Final verifier outcome and finding dispositions |
| riskAndDeviationReview | object | yes | Spec deviations, risks, scope changes, and shim/mock/fallback decisions |
| diffReview | object | yes | Changed files and story-scoped assessment |
| acceptanceChecks | array | yes | Required acceptance checks with status, evidence, and reasoning |
| logHandoff | object | yes | Fields needed to update `team-impl-log.md` |
| cleanupHandoff | object | yes | Deferred and accepted-risk items for later cleanup review |
| rulingRequest | object/null | yes | Caller ruling request when outcome requires one |
| recommendedImplLeadAction | enum | yes | `accept`, `reject`, `reopen`, or `ask-ruling` |

### Acceptance Check Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Check name |
| status | enum | yes | `pass`, `fail`, or `unknown` |
| evidence | array | yes | Artifact, spec, code, or log references |
| reasoning | string | yes | Why this status was assigned |

### Risk and Deviation Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | yes | What changed, what risk remains, or what decision was made |
| reasoning | string | yes | Why story-lead believes the item is acceptable, blocked, or needs ruling |
| evidence | array | yes | Spec, code, or artifact references |
| approvalStatus | enum | yes | `not-required`, `approved`, `needs-ruling`, or `rejected` |
| approvalSource | string/null | yes | Authority source when approved or rejected |

### Log Handoff

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recommendedState | string | yes | Recommended next run state for impl-lead to record |
| recommendedCurrentStory | string/null | yes | Recommended current story value |
| recommendedCurrentPhase | string/null | yes | Recommended current phase value |
| continuationHandles | object | yes | Latest implementor/verifier handles |
| storyReceiptDraft | object | yes | Receipt fields ready for `team-impl-log.md` |
| cumulativeBaseline | object | yes | Baseline before/after/current data |
| commitReadiness | object | yes | Commit status or required impl-lead commit action |
| openRisks | array | yes | Open risks to record in the log |

### Cleanup Handoff

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| acceptedRiskItems | array | yes | Items with accepted-risk disposition |
| deferredItems | array | yes | Items with defer disposition |
| cleanupRequired | boolean | yes | Whether this story contributes items to cleanup review |

---

## Dependencies

Technical dependencies:

- Existing `lbuild-impl` SDK operation functions remain callable from composed operations
- Existing runtime progress artifacts remain available for primitive commands
- Provider adapters continue returning session ids and persisted envelopes
- Package CLI tests can use mocked provider binaries to simulate long-running output and heartbeats

Process dependencies:

- Maintainer approval of story-lead/impl-lead vocabulary
- Maintainer approval of first `story-orchestrate` command surface before tech design
- Human review of first epic and tech design because this changes the implementation process itself

---

## Non-Functional Requirements

### Compatibility

- Existing primitive `--json` stdout consumers must continue parsing final envelopes without heartbeat filtering.
- Existing primitive commands remain available and documented as escape hatches.
- New story-lead outcome vocabulary must either map cleanly to current result envelope semantics or be introduced as a versioned composed-operation contract.

### Recoverability

- Story-lead state must be recoverable from disk using spec-pack root and story id.
- Current state and append-only event history must be separate artifacts.
- `team-impl-log.md` remains sufficient for run-level recovery after impl-lead accepts, rejects, or reopens story-lead output.
- The existing `team-impl-log.md` headings remain the recovery source of truth. If Tech Design changes the log template, the change must preserve current story sequence, current phase, continuation handle, receipt, baseline, cleanup, and commit-acceptance semantics.

### Agent Readability

- Heartbeat text must be short enough to be useful in repeated tool output.
- Heartbeat text must include the next caller action in the caller harness's terms.
- Story-lead status and final packages must be structured enough for later app server/database persistence.

### Provider Neutrality

- Story-lead provider is configurable.
- Skill docs do not assume Claude Code is the active caller host or story-lead provider.
- Codex story-lead and Claude Code story-lead paths are both testable before a default is chosen.

---

## Tech Design Questions

1. What exact output mode should `story-orchestrate` use for attached progress: JSONL on stdout, human text plus final JSON, or another contract that satisfies the streaming requirements above?
2. Which story-lead artifact names and directory layout satisfy the current snapshot, append-only event history, and terminal final package contract without overfitting the epic to implementation details?
3. Should story-lead child operation artifacts remain as sibling primitive artifacts under `artifacts/<story-id>/`, or should composed runs copy/reference them under the story-lead attempt?
4. How should heartbeat scheduling integrate with the existing runtime progress tracker without duplicating progress events?
5. What is the minimal typed schema for story-lead current state, events, review requests, ruling requests, and final package?
6. How should the runtime distinguish active, interrupted, accepted, review-required, and ambiguous story-lead attempts when only story id is provided?
7. What exact result shape should `story-orchestrate run` return when a prior interrupted or accepted attempt exists?
8. How should story-lead invoke existing SDK operations while preserving their current artifact numbering and envelope contracts?
9. What mocked-provider fixtures are needed to test Codex and Claude Code as story-lead providers?
10. What parts of provider context-window failure recovery can be deterministic, and what should remain story-lead/impl-lead judgment?
11. How should story-lead final packages map to existing `team-impl-log.md` templates and future log-template updates?
12. Which README, changelog, release, and skill files must be updated in the same stories as the behavior they document?

---

## Recommended Story Breakdown

### Story 0: Foundation and Contract Alignment
**Delivers:** Shared caller harness configuration, heartbeat contract scaffolding, story-lead contract scaffolding, run-config/SDK option surfaces, and `team-impl-log.md` handoff contract alignment needed by later stories.
**Prerequisite:** None
**ACs covered:**
- AC-1.4 (caller harness distinctions)
- AC-1.5 (cadence configuration)
- AC-2.2 (story id validation contract)
- AC-2.6 (review request contract)
- AC-3.1 through AC-3.3 (final package, risk/deviation, and acceptance-check shape)
- AC-3.4 (ruling request contract)
- AC-3.6 through AC-3.10 (log, receipt, commit, scoped acceptance, and cleanup handoff contracts)

**Estimated test count:** 12-18 contract and schema tests

### Story 1: Primitive Command Heartbeats
**Delivers:** Default-on heartbeat reminders for existing provider-backed commands without breaking exact JSON stdout.
**Prerequisite:** Story 0
**ACs covered:**
- AC-1.1 through AC-1.7
- AC-4.3 where skill docs must describe primitive heartbeat behavior
- AC-5.1a and heartbeat portions of AC-5.1c

**Estimated test count:** 14-20 unit and package tests

### Story 2: Story-Lead Run Surface and Durable Ledger
**Delivers:** `story-orchestrate run/resume/status`, story-id recovery, attempt discovery, current snapshots, append-only events, terminal completion markers, and story-level heartbeats.
**Prerequisite:** Story 1
**ACs covered:**
- AC-2.1 through AC-2.10
- AC-5.1b and story-ledger portions of AC-5.1c
- AC-5.3

**Estimated test count:** 18-26 unit, package, and recovery tests

### Story 3: Story-Lead Acceptance Package and Reopen Flow
**Delivers:** Story-lead final package, risk/deviation rigor, ruling request boundaries, impl-lead review input, reopen/remediation behavior, log handoff, receipt/commit readiness, and cleanup handoff.
**Prerequisite:** Story 2
**ACs covered:**
- AC-2.6
- AC-3.1 through AC-3.11
- AC-5.1b acceptance-package portions

Story 2 owns `resume` command dispatch and input validation for AC-2.6. Story 3 owns review-request incorporation into the story-lead loop and final package history.

**Estimated test count:** 18-28 contract, package, and resume/reopen tests

### Story 4: Story-Lead Provider Composition and Skill Alignment
**Delivers:** Story-lead composition over existing SDK operations, configurable story-lead provider, targeted `ls-impl` skill updates, rollout-documentation updates, and gorilla verification for fresh-agent UX.
**Prerequisite:** Stories 1-3
**ACs covered:**
- AC-2.9
- AC-4.1 through AC-4.7
- AC-5.2 through AC-5.4

**Estimated test count:** 8-14 automated tests plus gorilla evidence runs

---

## Validation Checklist

- [ ] User Profile has all four fields plus Feature Overview
- [ ] Onboarding Context defines methodology terms needed by this epic
- [ ] Flow Summary maps to detailed flow sections
- [ ] Scope boundaries and out-of-scope items reflect the design decisions already made
- [ ] Every AC is testable and has at least one TC
- [ ] TCs cover happy path, edge cases, errors, recovery, and permission/authority boundaries where applicable
- [ ] Data contracts cover heartbeat, story status, events, progress stream, review requests, ruling requests, final package, log handoff, cleanup handoff, acceptance checks, and risk/deviation records
- [ ] Tech Design Questions capture implementation mechanics without deciding them in the epic
- [ ] Story breakdown covers all ACs
- [ ] Story sequence separates heartbeat hardening from story-lead orchestration
- [ ] Story breakdown includes estimated test counts
- [ ] Skill updates are limited to process changes and observed log learnings
- [ ] Rollout obligations are met: README and release notes match the shipped command surface
- [ ] `team-impl-log.md`, story receipt, commit, baseline, and cleanup handoff semantics are preserved or explicitly changed
- [ ] Validator issues are addressed before Tech Design handoff
- [ ] Validation rounds complete with no substantive changes remaining
- [ ] Human review complete
- [ ] Self-review complete
