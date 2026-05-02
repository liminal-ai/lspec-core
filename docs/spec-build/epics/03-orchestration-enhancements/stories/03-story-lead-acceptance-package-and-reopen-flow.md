# Story 3: Story-Lead Acceptance Package and Reopen Flow

### Summary
<!-- Jira: Summary field -->
Add story-lead final-package rigor, review/ruling-driven reopen behavior, and the log/receipt/commit/cleanup handoffs impl-lead needs to accept or reopen a story.

### Description
<!-- Jira: Description field -->
**User Profile:** Liminal Spec implementation maintainer or orchestration agent running `lbuild-impl` against a spec pack.

**Objective:** Make story-lead output rich and explicit enough that impl-lead can accept, reject, reopen, commit, update `team-impl-log.md`, and plan cleanup without replaying the entire story from scratch.

**In Scope:**
- `resume` review-request and ruling behavior
- explicit final package sections and empty-array preservation
- risk/deviation/scope/shim item rigor
- acceptance checks, receipt readiness, and commit readiness
- story-lead evidence references
- log handoff and cleanup handoff payloads
- repeated-attempt history and smallest-safe-step replay hints

**Out of Scope:**
- initial `run` attempt discovery
- primitive heartbeat emission
- provider selection defaults and skill/readme rollout

**Dependencies:**
- Story 2: run surface, ledger, current snapshots, and event history

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
**Relevant Data Contracts**

**CLI Commands**

| Operation | Command | Description |
|-----------|---------|-------------|
| Resume story-lead | `lbuild-impl story-orchestrate resume --spec-pack-root <path> --story-id <id> [--story-run-id <id>] [--review-request-file <path>] [--ruling-file <path>]` | Resumes or reopens a story-lead attempt |

**Story-Orchestrate Caller-Visible Results**

| Command | Case | Required Caller-Visible Result |
|---------|------|--------------------------------|
| `resume` | Review request accepted | Story id, story run id, accepted review request reference, current snapshot reference, attached progress stream, and eventual terminal marker |
| `resume` | Ruling accepted | Story id, story run id, accepted ruling reference, current snapshot reference, attached progress stream, and eventual terminal marker |
| `resume` | Invalid review request or ruling | `invalid-review-request` or `invalid-ruling` result with no state mutation |

**Impl-Lead Review Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | yes | `impl-lead`, `human`, `reviewer-agent`, or another caller authority |
| decision | enum | yes | `reject`, `reopen`, `revise`, `ask-ruling`, or `stop` |
| summary | string | yes | Short description of why the prior result was not accepted |
| items | array | yes | Review items story-lead must address |
| evidence | array | no | Artifact, spec, code, or log references |

**Impl-Lead Review Item**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Stable review item id |
| severity | enum | yes | `blocker`, `major`, `minor`, or `note` |
| concern | string | yes | Concern the story-lead must address |
| requiredResponse | string | yes | Expected story-lead response, fix, ruling request, or explanation |
| evidence | array | no | Artifact, spec, code, or log references |

**Caller Ruling Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Stable ruling request id |
| decisionType | string | yes | Scope change, spec ambiguity, spec deviation, accepted risk, shim/mock/fallback, gate change, provider failure, repeated failure, or other |
| question | string | yes | Decision needed from caller authority |
| defaultRecommendation | string | yes | Story-lead's recommended safe action |
| evidence | array | yes | Artifact, spec, code, or log references supporting the request |
| allowedResponses | array | yes | Allowed ruling responses |

**Caller Ruling Response**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| rulingRequestId | string | yes | Request id being answered |
| decision | string | yes | Caller decision selected from the allowed responses or a documented override |
| rationale | string | yes | Reasoning for the decision |
| source | string | yes | `impl-lead`, `human`, `reviewer-agent`, or another caller authority |

**Final Story-Lead Package**

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

**Acceptance Check Item**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Check name |
| status | enum | yes | `pass`, `fail`, or `unknown` |
| evidence | array | yes | Artifact, spec, code, or log references |
| reasoning | string | yes | Why this status was assigned |

**Risk and Deviation Item**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | yes | What changed, what risk remains, or what decision was made |
| reasoning | string | yes | Why story-lead believes the item is acceptable, blocked, or needs ruling |
| evidence | array | yes | Spec, code, or artifact references |
| approvalStatus | enum | yes | `not-required`, `approved`, `needs-ruling`, or `rejected` |
| approvalSource | string/null | yes | Authority source when approved or rejected |

**Log Handoff**

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

**Cleanup Handoff**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| acceptedRiskItems | array | yes | Items with accepted-risk disposition |
| deferredItems | array | yes | Items with defer disposition |
| cleanupRequired | boolean | yes | Whether this story contributes items to cleanup review |

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
- [ ] `resume` accepts valid typed review/ruling input and rejects invalid input without mutation
- [ ] Final package, acceptance checks, log handoff, receipt/commit readiness, and cleanup handoff are explicit and validated
- [ ] Story-lead review history and replay-boundary hints persist across reopened attempts
- [ ] `team-impl-log.md` handoff data is complete enough for impl-lead run-level acceptance
- [ ] Story-local contract and reopen tests pass so Story 4 can complete the aggregate validation requirements
