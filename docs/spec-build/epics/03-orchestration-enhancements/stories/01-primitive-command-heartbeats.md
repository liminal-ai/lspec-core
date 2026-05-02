# Story 1: Primitive Command Heartbeats

### Summary
<!-- Jira: Summary field -->
Add default-on, fixed-cadence heartbeats to existing provider-backed primitive commands without breaking exact JSON stdout.

### Description
<!-- Jira: Description field -->
**User Profile:** Liminal Spec implementation maintainer or orchestration agent running `lbuild-impl` against a spec pack.

**Objective:** Make long-running primitive commands coach the live caller while they run so the caller keeps monitoring active work and does not final too early.

**In Scope:**
- primitive heartbeat emission for long-running provider-backed commands
- stderr-only heartbeat channel for primitive commands
- fixed-cadence summaries instead of per-output spam
- disable path for callers that need silent execution
- `ls-impl` heartbeat-monitoring guidance updates
- unit/package validation for primitive heartbeat behavior

**Out of Scope:**
- `story-orchestrate`
- story-run ledger and final package behavior
- review/ruling and reopen behavior
- provider composition or gorilla recovery evidence

**Dependencies:**
- Story 0: caller-harness and cadence contracts

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

**AC-4.3:** The skill teaches heartbeat-driven monitoring.

- **TC-4.3a: Codex monitoring guidance**
  - Given: The skill's monitoring guidance is loaded
  - When: The caller host is Codex
  - Then: The guidance says to keep the exec session open, poll with empty input, follow heartbeat cadence, and avoid final while work is running
- **TC-4.3b: Claude Code Monitor guidance**
  - Given: The skill's monitoring guidance is loaded
  - When: The caller host is Claude Code
  - Then: The guidance says Monitor may be used when available and does not imply Monitor exists in Codex

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

See `../tech-design.md`, `../tech-design-invocation-surface.md`, `../tech-design-story-runtime.md`, and `../test-plan.md` for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- [ ] Heartbeats emit on fixed cadence for all in-scope primitive provider-backed commands
- [ ] Primitive `--json` stdout remains exact while heartbeat text stays on stderr
- [ ] Silence summaries and disable behavior are covered by tests
- [ ] `ls-impl` monitoring guidance is updated for Codex and Claude Code callers
- [ ] Story-local heartbeat tests and package checks pass so Story 4 can complete the aggregate validation requirements
