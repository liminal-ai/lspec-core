# Story 0: Foundation and Contract Alignment

### Summary
<!-- Jira: Summary field -->
Establish caller-harness defaults, cadence precedence, and story-id validation scaffolding that later orchestration stories build on.

### Description
<!-- Jira: Description field -->
**User Profile:** Liminal Spec implementation maintainer or orchestration agent running `lbuild-impl` against a spec pack.

**Objective:** Put the shared caller-harness and story-selection contract in place before any long-running heartbeat or story-lead runtime behavior lands.

**In Scope:**
- caller-harness-specific guidance contracts
- cadence precedence across CLI, SDK, and run-config surfaces
- non-mutating story-id validation before story work begins
- foundational contract scaffolding that later stories will use

**Out of Scope:**
- emitting primitive heartbeats
- running story-lead attempts
- story-level acceptance, reopen, or cleanup behavior
- provider composition, skill updates, or gorilla evidence

**Dependencies:**
- none
- later stories depend on these caller-harness and validation contracts staying stable

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

**AC-2.2:** Story id validation prevents silent work on the wrong story.

- **TC-2.2a: Valid story id accepted**
  - Given: A story id exists in the spec-pack story inventory
  - When: Caller invokes `story-orchestrate run` with that story id
  - Then: Runtime orients the story-lead against that story
- **TC-2.2b: Invalid story id rejected**
  - Given: A story id does not exist in the spec-pack story inventory
  - When: Caller invokes `story-orchestrate run`, `resume`, or `status` with that story id
  - Then: Runtime returns a clear invalid-story result and does not create or mutate story-lead state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
**Relevant Data Contracts**

**Heartbeat Message**

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

**New Public Error / Decision Results**

| Result | Applies To | Description |
|--------|------------|-------------|
| `invalid-story-id` | `run`, `resume`, `status` | Story id is not in the spec-pack story inventory |

**Outcome Vocabulary Compatibility**

| Concept | Existing Runtime Vocabulary | Story-Lead Vocabulary | Requirement |
|---------|-----------------------------|-----------------------|-------------|
| Primitive caller decision needed | `needs-user-decision` status, `needs-human-ruling` outcome | n/a | Existing primitive operation vocabulary remains unchanged |
| Story-lead caller ruling needed | n/a | `needs-ruling` terminal outcome | Only `story-orchestrate` may introduce this composed-operation outcome, and it must be versioned or mapped without changing primitive outcomes |

See `../tech-design.md`, `../tech-design-invocation-surface.md`, `../tech-design-story-runtime.md`, and `../test-plan.md` for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- [ ] Caller-harness guidance contract is defined for `generic`, `codex`, and `claude-code`
- [ ] Cadence precedence is consistent across CLI, SDK, and persisted run-config surfaces
- [ ] Invalid story-id handling is non-mutating and covered by tests
- [ ] Shared contract scaffolding needed by later stories is in place
- [ ] `red-verify` and `verify` pass for the implemented changes
