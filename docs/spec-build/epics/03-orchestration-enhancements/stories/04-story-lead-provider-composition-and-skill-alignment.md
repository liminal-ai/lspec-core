# Story 4: Story-Lead Provider Composition and Skill Alignment

### Summary
<!-- Jira: Summary field -->
Finish provider selection, skill alignment, and validation evidence for the story-lead runtime before choosing a default story-lead provider.

### Description
<!-- Jira: Description field -->
**User Profile:** Liminal Spec implementation maintainer or orchestration agent running `lbuild-impl` against a spec pack.

**Objective:** Prove that the story runtime can compose over existing SDK operations with configurable story-lead providers, while the CLI-delivered skill and release-facing docs accurately describe the shipped process.

**In Scope:**
- configurable story-lead provider selection
- targeted `ls-impl` skill updates required by the changed process
- caller/provider terminology corrections
- story-id recovery and cleanup/commit guidance in docs
- aggregate unit and package validation requirements that confirm the shard set covers heartbeat and story-lead contracts
- package/integration/gorilla validation required before choosing a default story-lead provider
- rollout-documentation updates

**Out of Scope:**
- adding new primitive commands
- changing run-level acceptance authority
- introducing the future fresh-turn story-lead loop

**Dependencies:**
- Story 3: final package, reopen flow, and handoff semantics

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.9:** Story-lead provider is configurable and not hard-coded to Claude Code.

- **TC-2.9a: Configured story-lead provider**
  - Given: The run config selects a story-lead provider/model
  - When: `story-orchestrate run` starts
  - Then: Runtime launches the configured provider/model for story-lead
- **TC-2.9b: Codex story-lead testable**
  - Given: The run config selects Codex as story-lead provider
  - When: A mocked-provider package test runs
  - Then: Runtime routes story-lead through the Codex provider adapter without Claude Code-specific assumptions

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

**AC-5.4:** Story-lead provider variants are tested before setting a default.

- **TC-5.4a: Claude Code story-lead smoke**
  - Given: Claude Code is configured as story-lead provider in a mocked or gated environment
  - When: Story orchestration runs
  - Then: The story-lead flow reaches a terminal test outcome and writes durable artifacts
- **TC-5.4b: Codex story-lead smoke**
  - Given: Codex is configured as story-lead provider in a mocked or gated environment
  - When: Story orchestration runs
  - Then: The story-lead flow reaches a terminal test outcome and writes durable artifacts

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
**Relevant Data Contracts**

**CLI Commands**

| Operation | Command | Description |
|-----------|---------|-------------|
| Run story-lead | `lbuild-impl story-orchestrate run --spec-pack-root <path> --story-id <id>` | Orients from disk and runs a story-lead for one story |
| Resume story-lead | `lbuild-impl story-orchestrate resume --spec-pack-root <path> --story-id <id> [--story-run-id <id>] [--review-request-file <path>] [--ruling-file <path>]` | Resumes or reopens a story-lead attempt |
| Read story-lead status | `lbuild-impl story-orchestrate status --spec-pack-root <path> --story-id <id> [--story-run-id <id>]` | Reads durable story-lead status |

**Outcome Vocabulary Compatibility**

| Concept | Existing Runtime Vocabulary | Story-Lead Vocabulary | Requirement |
|---------|-----------------------------|-----------------------|-------------|
| Primitive caller decision needed | `needs-user-decision` status, `needs-human-ruling` outcome | n/a | Existing primitive operation vocabulary remains unchanged |
| Story-lead caller ruling needed | n/a | `needs-ruling` terminal outcome | Only `story-orchestrate` may introduce this composed-operation outcome, and it must be versioned or mapped without changing primitive outcomes |
| Story-lead scoped acceptance | none | `accepted` terminal outcome | This outcome applies only to story-lead final packages |
| Runtime blocked | `blocked` status / `block` outcome | `blocked` terminal outcome | Mapping must preserve current blocked/error semantics |

See `../tech-design.md`, `../tech-design-invocation-surface.md`, `../tech-design-story-runtime.md`, and `../test-plan.md` for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- [ ] Story-lead provider selection works for configured providers without Claude Code-specific assumptions
- [ ] Targeted `ls-impl` updates land for caller/provider terminology, heartbeat monitoring, story-id recovery, and commit/cleanup obligations
- [ ] Package tests, provider smoke, and gorilla evidence required by this story are captured
- [ ] README, changelog, and release notes match the shipped `story-orchestrate` surface and caller guidance
- [ ] `verify-all` and required manual evidence gates are satisfied for this story
