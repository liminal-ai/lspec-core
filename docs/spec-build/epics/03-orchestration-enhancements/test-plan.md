# Test Plan: Orchestration Enhancements

This document holds the TC→test mapping, mock strategy, fixture catalog, and per-chunk test totals for orchestration enhancements. The companion tech-design docs define architecture and interfaces. This file defines how the epic's TCs become tests.

The epic contains 98 unique TC ids. The automated test totals in this document count executable test cases, not TC ids. Several files use parameterized or grouped tests that cover multiple TC ids in one executable suite, so the automated test count is intentionally lower than the TC count.

---

## Test Strategy

### Primary Test Philosophy

This epic follows the service-mock guidance from `ls-tech-design`:

- test public entry points first
- exercise internal orchestration paths for real
- mock only external boundaries

For this feature, the primary entry points are:

- primitive CLI commands with heartbeat-enabled caller options
- `story-orchestrate run`
- `story-orchestrate resume`
- `story-orchestrate status`
- SDK operations for the same surfaces

### Mock Boundaries

| Boundary | Mock? | Why |
|----------|-------|-----|
| Provider subprocesses | Yes | External CLIs with timing and output variability |
| Filesystem failure cases | Yes, selectively | Invalid story ids, invalid review files, write failures, stale/ambiguous attempt layouts |
| Git/process environment edges | Yes, selectively | Quick-fix and working-tree guards where needed |
| Story-lead coordinator internals | No | Integration between discovery, ledger, SDK child ops, and final package assembly is the behavior we need to trust |
| Child SDK operation surfaces | No in story-runtime tests | Story-lead should exercise real SDK entry points with mocked external provider boundaries |

### Test Layers

| Layer | Purpose | Example Files |
|-------|---------|---------------|
| Unit | Contracts, discovery, heartbeat formatting, ledger, handoff mappers | `tests/unit/core/heartbeat-emitter.test.ts`, `tests/unit/core/story-run-ledger.test.ts` |
| Package | Built CLI/SDK behavior and end-to-end entrypoint wiring with mocked providers | `tests/package/cli/story-orchestrate-run.test.ts` |
| Integration | Real-provider smoke where configured | `tests/integration/story-lead-provider-smoke.test.ts` |
| Gorilla / Evidence | Fresh-agent usability and recovery proof | `docs/spec-build/epics/03-orchestration-enhancements/gorilla/*.md` |

---

## Fixture Catalog

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `tests/support/providers/primitive-long-run/*.txt` | Long-running primitive provider output with progress and silence windows | AC-1.1, AC-1.6, AC-1.7 |
| `tests/support/providers/story-lead/claude-code/accept.json` | Story-lead action sequence ending in `accepted` | AC-2.9, AC-3.1-3.8 |
| `tests/support/providers/story-lead/codex/accept.json` | Codex story-lead action sequence ending in `accepted` | AC-2.9, AC-5.4 |
| `tests/support/providers/story-lead/reopen.json` | Review-request reopen path | AC-2.6, AC-3.9 |
| `tests/support/providers/story-lead/needs-ruling.json` | Story-lead asks for caller ruling | AC-3.4 |
| `tests/support/providers/story-lead/context-failure.json` | Context-window/interruption path with replay hint | AC-2.10, AC-3.11 |
| `tests/support/spec-pack-fixtures/story-runtime/*` | Story inventory, prior primitive artifacts, prior story-lead attempts, and log-template baselines | AC-2.2-2.6, AC-3.6-3.10 |

Mocked-provider fixtures are derived from structured adapter outputs, not hand-written free-form result blobs. Primitive parser fixtures remain in the existing provider-parser coverage; story-lead fixtures are new action-sequence payloads.

---

## TC → Test Mapping

### Flow 1: Caller Heartbeats for Primitive Operations

#### `tests/unit/cli/primitive-heartbeats.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.1a, TC-1.1b | Emits one heartbeat after the cadence window and none for a short run | Uses mocked long-running and short-running provider executions |
| TC-1.3a | Sends heartbeat text to `stderr` in non-JSON mode | Command-level assertion |
| TC-1.7a | Suppresses heartbeat output when disabled | Covers CLI and SDK disable flags |

#### `tests/package/cli/primitive-json-output.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.2a, TC-1.2b | Preserves exact final JSON on `stdout` while heartbeats appear on `stderr` | Built CLI smoke with mocked provider runtime |

#### `tests/unit/core/caller-guidance.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.4a | Codex caller guidance says to poll the same exec session and not final while running | String-level guidance assertions |
| TC-1.4b | Claude Code caller guidance mentions Monitor when available | String-level guidance assertions |
| TC-1.4c | Generic caller guidance uses attached-process/status-file language | String-level guidance assertions |

#### `tests/unit/sdk/heartbeat-options.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.5a, TC-1.5b, TC-1.5c, TC-1.5d | Resolves default cadence, CLI override, run-config cadence, and SDK cadence precedence correctly | Parameterized precedence matrix |

#### `tests/unit/core/heartbeat-emitter.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.6a, TC-1.6b | Emits fixed-cadence summaries rather than per-output spam, including silence summaries | Uses synthetic runtime-progress snapshots |

### Flow 2: Story-Lead Run Lifecycle

#### `tests/package/cli/story-orchestrate-help.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.1a, TC-2.1b, TC-2.1c | CLI exposes `run`, `resume`, and `status` help surfaces | Built CLI help assertions |

#### `tests/unit/core/story-run-discovery.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.2a, TC-2.2b | Validates known story ids and rejects invalid ones without mutation | Uses spec-pack fixture inventory |
| TC-2.3a, TC-2.3b, TC-2.3c, TC-2.3d, TC-2.3e | Selects the correct `run` case for no work, primitive-only, accepted, interrupted, and ambiguous stories | Parameterized over fixture directories |
| TC-2.5a, TC-2.5b, TC-2.5c | `status` selects a single attempt or returns ambiguity by story id | Reuses attempt fixtures |
| TC-2.10a | Interrupted attempt remains discoverable by story id | Uses incomplete attempt fixture |

#### `tests/unit/core/story-run-ledger.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.4a, TC-2.4b, TC-2.4c | Writes current snapshot, append-only event history, and terminal final package artifacts | Artifact persistence layer |
| TC-2.10b | Records context-window failure metadata in current state or events | Failure-hint persistence |

#### `tests/package/cli/story-orchestrate-run.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.7a, TC-2.7b | Emits story-level heartbeats with 10-minute default cadence | Mocked long-running story-lead runtime |
| TC-2.8a, TC-2.8b | Emits terminal completion markers and distinguishes incomplete runs | Final envelope + interrupt case |

#### `tests/package/cli/story-orchestrate-status.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.5a, TC-2.5b, TC-2.5c | CLI `status` renders the same attempt-selection semantics as SDK | Command-level wrapper coverage |

### Flow 3: Story-Lead Acceptance and Impl-Lead Handoff

#### `tests/unit/core/story-final-package.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.1a, TC-3.1b | Final package contains all required sections and preserves empty arrays | Schema + builder tests |
| TC-3.2a, TC-3.2b, TC-3.2c, TC-3.2d | Risk/deviation items always carry description, reasoning, evidence, and approval status | Parameterized item-builder tests |
| TC-3.3a, TC-3.3b, TC-3.3c | Acceptance checks are explicit, evidence-backed, and block `accepted` when failed/unknown | Acceptance-package validation |
| TC-3.7a, TC-3.7b, TC-3.7c | Receipt draft completeness and commit-readiness blockers are surfaced in the final package | Receipt/commit sections |
| TC-3.8a | Story-lead scoped acceptance wording is explicit | Output wording assertion |

#### `tests/unit/core/review-ruling-contracts.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.4a, TC-3.4b, TC-3.4c, TC-3.4d, TC-3.4e, TC-3.4f, TC-3.4g, TC-3.4h, TC-3.4i | Story-lead review/ruling requests cover every required authority-boundary category | Contract and builder tests |
| TC-2.6b | Review request is persisted into current state, events, and final package evidence | Resume-path contract coverage |

#### `tests/unit/core/story-lead-loop.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.5a, TC-3.5b, TC-3.5c, TC-3.5d | Final package references implementor, self-review, verifier, and fix artifacts used to reach the result | Uses mocked child SDK ops with real ledger/finalizer |
| TC-3.9a, TC-3.9b | Reopen/review history is preserved across multiple accepted attempts | Uses reopen fixture sequence |
| TC-3.11a, TC-3.11b | Provider-output-invalid and context-window failures record the smallest safe replay boundary | Failure path coverage |

#### `tests/unit/core/log-handoff.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.6a, TC-3.6b | `logHandoff` includes story id, next state, phase, continuation handles, baseline data, and receipt draft | Mapped to current log headings |

#### `tests/unit/core/cleanup-handoff.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.10a, TC-3.10b, TC-3.10c | Cleanup handoff exports accepted-risk and deferred items, or explicitly says none | Final-package extraction logic |

#### `tests/package/cli/story-orchestrate-resume.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.6a, TC-2.6c | `resume` accepts valid review requests and rejects invalid ones without mutation | CLI + SDK result-case coverage |

### Flow 4: Skill and Process Alignment

#### `tests/unit/docs/ls-impl-orchestration-docs.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-4.1a, TC-4.1b | Root skill text uses generic live-orchestrator language and scopes Claude Code references correctly | Asset-content assertions |
| TC-4.2a, TC-4.2b | Skill distinguishes caller harness from provider harness and uses caller-oriented examples | Terminology assertions |
| TC-4.3a, TC-4.3b | Skill documents Codex heartbeat polling and Claude Code Monitor guidance correctly | Monitoring guidance assertions |
| TC-4.4a, TC-4.4b | Skill documents story-lead and impl-lead boundaries | Boundary guidance assertions |
| TC-4.5a | Skill documents recovery by `spec-pack-root + story-id` | Recovery guidance assertion |
| TC-4.6a, TC-4.6b, TC-4.6c | Skill preserves log handoff, commit acceptance, and cleanup handoff obligations | Closeout guidance assertions |
| TC-4.7a, TC-4.7b | Skill carries forward smallest-step replay and retained-context caution | Recovery note assertions |

### Flow 5: Validation Requirements

#### `tests/unit/sdk/heartbeat-and-story-runtime-contracts.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-5.1a | Unit coverage exists for heartbeat contract behavior | Meta-test over suite inventory and key assertions |
| TC-5.1b | Unit coverage exists for story-lead schema/contract behavior | Meta-test over suite inventory and key assertions |
| TC-5.1c | Package coverage exists for primitive heartbeat behavior and `story-orchestrate run/resume/status` | Meta-test over package suite inventory |

#### `tests/integration/story-lead-provider-smoke.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.9a, TC-5.4a | Claude Code story-lead selection and smoke run reaches terminal outcome and writes durable artifacts | Env-gated integration run |
| TC-2.9b, TC-5.4b | Codex story-lead selection and smoke run reaches terminal outcome and writes durable artifacts | Env-gated integration run |

#### `docs/spec-build/epics/03-orchestration-enhancements/gorilla/heartbeat-usability.md`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-5.2a | Fresh agent follows heartbeat reminders, polls again, avoids final while active, and records final envelope | Maintainer evidence run |

#### `docs/spec-build/epics/03-orchestration-enhancements/gorilla/story-id-recovery.md`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-5.3a | Fresh agent recovers by story id without the story run id | Maintainer evidence run |

---

## Non-TC Decided Tests

These tests are required by the design even though they do not map 1:1 to a TC:

| Test | Why It Exists | Planned File |
|------|----------------|--------------|
| Candidate ordering is stable by `updatedAt` when ambiguity is reported | Prevents flaky caller experience in `ambiguous-story-run` results | `tests/unit/core/story-run-discovery.test.ts` |
| Review/ruling payload schema round-trips through CLI JSON output | Protects external tooling around reopened story runs | `tests/package/cli/story-orchestrate-resume.test.ts` |
| Story-lead `progressListener` absence still writes durable state cleanly | SDK callers may not attach output listeners | `tests/unit/core/story-lead-loop.test.ts` |
| Root help text and README stay aligned on `story-orchestrate` usage | Prevents doc/runtime drift | `tests/unit/docs/story-orchestrate-doc-surfaces.test.ts` |

---

## Chunk Breakdown With Test Counts

### Chunk 0: Contract and Config Foundation

**Scope:** Caller harness config, story-orchestrate schemas, review/ruling contracts, acceptance package shape, log handoff, cleanup handoff
**ACs:** AC-1.4, AC-1.5, AC-2.2, AC-2.6, AC-3.1 through AC-3.4, AC-3.6 through AC-3.10
**Relevant Tech Design Sections:** `tech-design.md` §Module Architecture Overview, `tech-design-invocation-surface.md` §Interface Definitions, `tech-design-story-runtime.md` §Interface Definitions
**Non-TC Decided Tests:** schema round-trip, candidate ordering
**Test Count:** 14 tests + 2 non-TC

### Chunk 1: Primitive Heartbeats

**Scope:** Heartbeat scheduling, caller guidance, stderr channel behavior, JSON stdout preservation, disable path
**ACs:** AC-1.1 through AC-1.7
**Relevant Tech Design Sections:** `tech-design-invocation-surface.md` §Primitive Heartbeat Emission, §Interface Definitions, §Testing Strategy
**Non-TC Decided Tests:** none
**Test Count:** 17 tests

### Chunk 2: Story-Lead Run Surface and Ledger

**Scope:** `run`, `status`, attempt discovery, current/events/final artifacts, terminal markers, story-level heartbeats
**ACs:** AC-2.1 through AC-2.5, AC-2.7, AC-2.8, AC-2.10
**Relevant Tech Design Sections:** `tech-design-invocation-surface.md` §Flow 2-3, `tech-design-story-runtime.md` §Flow 1, §Story-Run Artifact Layout
**Non-TC Decided Tests:** candidate ordering by updatedAt
**Test Count:** 22 tests + 1 non-TC

### Chunk 3: Story-Lead Acceptance and Reopen

**Scope:** review/ruling incorporation, final package, acceptance checks, replay hints, log handoff, cleanup handoff
**ACs:** AC-2.6, AC-3.1 through AC-3.11
**Relevant Tech Design Sections:** `tech-design-story-runtime.md` §Flow 2-5, §Interface Definitions
**Non-TC Decided Tests:** progress-listener absence, review/ruling CLI schema round-trip
**Test Count:** 24 tests + 2 non-TC

### Chunk 4: Provider Composition, Skill Alignment, and Validation Evidence

**Scope:** story-lead provider selection, story-lead provider smoke, skill/doc alignment, gorilla evidence
**ACs:** AC-2.9, AC-4.1 through AC-4.7, AC-5.1 through AC-5.4
**Relevant Tech Design Sections:** `tech-design-story-runtime.md` §Story-Lead Coordinator Loop, `tech-design-invocation-surface.md` §Testing Strategy
**Non-TC Decided Tests:** root help/README alignment
**Test Count:** 10 automated checks + 2 manual evidence runs + 1 non-TC

### Reconciliation Summary

| Chunk | Automated Tests | Non-TC Tests | Manual Evidence |
|-------|-----------------|--------------|-----------------|
| Chunk 0 | 14 | 2 | 0 |
| Chunk 1 | 17 | 0 | 0 |
| Chunk 2 | 22 | 1 | 0 |
| Chunk 3 | 24 | 2 | 0 |
| Chunk 4 | 10 | 1 | 2 |
| **Total** | **87** | **6** | **2** |

The per-chunk totals should reconcile against the eventual per-file counts in implementation. If new tests are added during design validation, update this table and the relevant chunk row in one pass.

They do not need to equal the epic's TC count one-for-one because grouped and parameterized tests deliberately cover multiple TC ids where the setup and assertion shape are shared.

---

## Verification Scripts

| Script | Expected Coverage Contribution |
|--------|-------------------------------|
| `red-verify` | Type and format stability for new contracts, CLI registration, and companion module imports |
| `verify` | All unit tests in this plan, including heartbeat, discovery, ledger, final package, and docs assertions |
| `green-verify` | Same as `verify` plus no test-file mutation during Green |
| `verify-all` | `verify` plus package CLI smoke and env-gated integration smoke for story-lead providers |

Gorilla evidence does not run under `verify-all`; it is a release/story acceptance artifact captured beside this epic.
