# Story 3: Runtime Contract Hardening

### Summary
<!-- Jira: Summary field -->

Harden the public runtime surface by versioning contracts, replacing string-matched errors, deriving schemas from canonical contracts, making writes atomic and concurrency-safe, filtering subprocess environments, and fixing the two known regressions.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Remove the contract-drift and runtime-safety edges that are acceptable in an internal bundled runtime but not in a published package.

**Scope In:**
- Envelope and persisted-state version markers
- Typed error taxonomy (envelope-everywhere for structured failures; throws reserved for programming errors and infrastructure failures)
- Canonical schema derivation
- Atomic writes for artifacts, progress, and status
- Concurrency-safe artifact-index reservation, including lazy garbage-collection of stale zero-byte placeholders inside the artifact-writer (so `inspect` remains read-only per the operation inventory)
- Subprocess env allowlist
- Fixes for Codex retained-session reuse and Codex preflight auth-unknown fallback

**Scope Out:**
- New user-facing operations
- Skill migration and outer-loop changes
- Any modification under `liminal-spec/processes/impl-cli/` or `liminal-spec/processes/codex-impl/`; work lands in the repo root and supporting repo-root config/docs only

**Dependencies:**
- Story 1 SDK shape
- Story 2 CLI envelope preservation
- Canonical result contracts from the migrated runtime

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-4.1:** The CLI envelope and persisted-state files carry an explicit version marker that consumers can branch on.

- **TC-4.1a:** Envelope version field
  - Given: Any envelope written by any command
  - When: The envelope is parsed
  - Then: The `version` field is present and set to a numeric value, distinct from the implementation's package version
- **TC-4.1b:** Persisted state version markers
  - Given: Any persisted state file (run config, progress snapshot, status file)
  - When: The file is parsed
  - Then: A version marker field is present at the document root

**AC-4.2:** Errors are classified by a stable `code` taxonomy, not by string-matching message text. Codes appear in two surfaces: (i) as the `code` field on entries in the envelope's `errors[]` array for structured workflow failures (returned, never thrown), and (ii) as the `code` field on typed throw classes for programming/invariant errors only (Zod boundary parse failures, invariant violations).

- **TC-4.2a:** Stable codes on envelope errors[]
  - Given: Any structured failure path in the package (invalid spec pack, missing run-config, gate unresolved, provider unavailable, etc.)
  - When: The SDK function is invoked against inputs that trigger the failure
  - Then: The function returns an envelope (does not throw); `envelope.errors[0].code` is a stable string from the taxonomy in §Q8; `envelope.errors[0]` matches `{ code, message, detail? }` shape
- **TC-4.2b:** No string-matched error detection
  - Given: The new package source
  - When: A reviewer searches for substring matching against error message text in non-test code
  - Then: No matches are found in branching logic; classification flows through `instanceof` or the `code` field only
- **TC-4.2c:** Typed throws for boundary parse failures
  - Given: An SDK function call whose input fails Zod boundary parse (e.g., wrong type, missing required key)
  - When: The function is invoked
  - Then: The function throws an instance of `InvalidInputError` (the §Q8 class for boundary parse failures); `error.code` matches the taxonomy; the throw is the documented signal that the caller's input was wrong, not that the workflow failed

**AC-4.3:** Provider-payload schemas are derived from the canonical result-contract schemas, not redeclared independently.

- **TC-4.3a:** Schemas derived, not redeclared
  - Given: The schemas for each role's provider payload
  - When: A reviewer inspects how each schema is defined
  - Then: Each is derived from the canonical result-contract schema through a documented transformation (omit, pick, extend), not declared standalone
- **TC-4.3b:** Drift cannot occur silently
  - Given: A change to a canonical result-contract schema field
  - When: The package builds
  - Then: The change is reflected automatically in every derived payload schema, and any breakage surfaces at build or test time, not at runtime

**AC-4.4:** Artifact, progress, and status writes are atomic. A crash mid-write leaves either the prior version or the new version, never a partial.

- **TC-4.4a:** Atomic write behavior
  - Given: A command run that writes an artifact
  - When: The write is interrupted (simulated by killing the process between the temp write and the final rename)
  - Then: The artifact path either contains the prior content or the new content — never a partial, malformed JSON

**AC-4.5:** Artifact-index reservation is concurrency-safe under simultaneous invocation, and the artifact directory does not accumulate stale placeholder reservations from crashed callers.

- **TC-4.5a:** Concurrent reservation
  - Given: Two CLI commands invoked simultaneously against the same spec pack
  - When: Both reserve the next artifact index
  - Then: Each receives a distinct index and neither overwrites the other's artifact
- **TC-4.5c:** Stale placeholder cleanup during reserveIndex
  - Given: An artifact directory containing zero-byte placeholder files older than the configured stale-reservation timeout (default: 5 minutes)
  - When: A subsequent `reserveIndex(name)` call is made
  - Then: The stale placeholders are removed before the new reservation; `reserveIndex` returns the next available index without those slots being treated as reserved; `inspect` is not the operation that performs the cleanup (it remains read-only per the operation inventory)

**AC-4.6:** Subprocess environment inheritance is filtered through an allowlist rather than passing the entire parent environment.

- **TC-4.6a:** Env allowlist
  - Given: A provider subprocess spawned by the package
  - When: The subprocess's environment is captured
  - Then: Only the variables in the documented allowlist (and the caller-provided overrides) are present; other parent-process variables are not inherited

**AC-4.7:** The two known regressions identified in pre-epic review are fixed and covered by tests.

- **TC-4.7a:** Codex retained-session reuse
  - Given: A Codex story-implement call followed by a story-continue call referencing the prior session
  - When: The continue call executes
  - Then: The session id from the first execution is present in the call and the continuation succeeds
- **TC-4.7b:** Preflight binary-present, auth-unknown
  - Given: A preflight run where the Codex binary is present but no safe auth-status probe is available
  - When: Preflight completes
  - Then: The outcome is `ready` (binary-present, auth-unknown), not `blocked`

**AC-4.8:** Internal module boundaries are not mocked anywhere in the package's tests, and external-boundary mock fixtures are derived from captured real provider output rather than hand-written.

- **TC-4.8a:** No internal mocks
  - Given: The package's test suite
  - When: A reviewer inspects mock declarations
  - Then: All mocks target external boundaries (provider subprocess, filesystem at the very edge, network); no mock targets an internal module
- **TC-4.8b.1:** Fixture-provenance rule + consuming test shape (Story 3 satisfies this half)
  - Given: The package's mock-fixture loader and the parser-contract test scaffold
  - When: A reviewer inspects how fixtures are consumed
  - Then: The loader requires each fixture file to declare a provenance comment (provider, command, capture date) at the top and refuses to load fixtures missing it; `tests/parser-contract/fixtures.test.ts` walks `tests/parser-contract/fixtures/` and asserts every present file has a parsable provenance comment; the parser-contract test files (`tests/parser-contract/{claude-code,codex,copilot}.test.ts`) exist and structurally consume any fixtures that land under the corresponding directory; no error-detection branch in `src/` matches against fixture content via string substrings (this is enforced by the rule, not by fixture presence)
  - Note: Story 3 lands the rule, the loader, the provenance check, and the parser-contract test scaffolding. The fixture directories (`tests/parser-contract/fixtures/<provider>/`) exist but may be empty at Story 3 exit; the parser-contract test files report a "no fixtures yet" pass in that case. Story 4 creates and commits the captured real-provider fixtures that exercise the rule end-to-end (see Story 4 AC-5.3 plus the satisfaction half below).
- **TC-4.8b.2:** Captured real-provider fixtures committed (Story 4 satisfies this half)
  - Given: The committed fixture files at the end of Story 4
  - When: A reviewer inspects each fixture under `tests/parser-contract/fixtures/<provider>/<scenario>.txt`
  - Then: Each fixture's leading provenance comment names a real provider run (provider, command, capture date), the dates parse, and the parser-contract tests defined in Story 3 pass against the real captured content (proving the rule end-to-end). See Story 4 for the satisfying scope and TCs.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Hardening Ownership**

| Concern | Required Contract |
|---------|-------------------|
| Envelope versioning | Every CLI envelope carries a numeric schema version distinct from package version |
| Persisted-state versioning | Run config, progress snapshot, and status file carry root-level version markers |
| Error taxonomy | Structured failures surface stable error codes through typed error classes |
| Schema derivation | Provider payload schemas derive from canonical result contracts rather than being redeclared |
| Atomicity | Artifact, progress, and status writes leave prior-or-new content only, never partial content |
| Concurrency safety | Simultaneous artifact-index reservation yields distinct indexes with no overwrite |
| Subprocess isolation | Provider subprocesses inherit only documented allowlist vars plus caller overrides |

**CLI Output Envelope**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command | string | yes | Name of the command that produced the envelope |
| version | integer | yes | Envelope schema version; consumers branch on this |
| status | enum | yes | One of `ok`, `needs-user-decision`, `blocked`, `error` |
| outcome | string | yes | Command-specific outcome string for human display |
| result | object | no | Command-specific structured result; absent on hard failure |
| errors | array of CliError | yes | Empty when status is `ok` |
| warnings | array of string | yes | Non-fatal messages; may be empty |
| artifacts | array of CliArtifactRef | yes | Persisted artifact paths; may be empty |
| startedAt | ISO 8601 UTC | yes | Timestamp when the command began execution |
| finishedAt | ISO 8601 UTC | yes | Timestamp when the envelope was finalized |

**CliError**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | yes | Stable error code from the package's error taxonomy |
| message | string | yes | Human-readable summary |
| detail | string | no | Optional context detail; not parsed by callers |

**CliArtifactRef**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | yes | Artifact kind (for example, `result-envelope`, `progress-snapshot`) |
| path | string | yes | Filesystem path to the persisted artifact |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Envelope and persisted-state version markers are present and documented
- [ ] Typed error taxonomy replaces string-matched classification
- [ ] Provider payload schemas derive from canonical contracts
- [ ] Atomic write coverage exists for artifacts, progress, and status
- [ ] Concurrent artifact-index reservation is proven
- [ ] Subprocess env allowlist is documented and tested
- [ ] Both known regressions are fixed and covered
- [ ] Mock-discipline checks are present and passing
- [ ] AC-4.8b is structurally enforced (TC-4.8b.1 satisfied by Story 3); full evidence is proven once Story 4 fixtures land (TC-4.8b.2)
- [ ] No file under `liminal-spec/processes/impl-cli/` or `liminal-spec/processes/codex-impl/` was modified
