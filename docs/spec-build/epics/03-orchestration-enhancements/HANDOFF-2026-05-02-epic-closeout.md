# Handoff — Epic 03 Closeout Recovery

Read this top to bottom before changing code.

This handoff is for a **fresh agent** taking over Epic 03 closeout in `lbuild-impl`.

The goal is **not** to re-orchestrate the whole epic from scratch. The goal is to finish the epic-closeout fixes that epic verification and synthesis identified after Stories 0-4 were already accepted.

---

## 1. Project intro

- **Project name:** `lbuild-impl`
- **Repo path:** `/Users/leemoore/code/lspec-core`
- **What it is:** a CLI and SDK for spec-pack implementation workflows. It reads a spec pack, runs bounded implementation and verification operations, writes durable artifacts, and supports story-level orchestration through `story-orchestrate`.
- **Spec pack, in plain terms:** one implementation bundle containing an epic, tech design, test plan, and story shards for a feature.
- **Relevant surface in this epic:** `story-orchestrate` and its story-lead runtime

This epic added story-level orchestration surfaces, but epic verification proved that the most important part is still incomplete: the runtime still scaffolds final packages from preexisting artifacts instead of driving the real bounded child-operation loop.

---

## 2. Epic intro

- **Epic path:** [docs/spec-build/epics/03-orchestration-enhancements](./)
- **Epic title:** Orchestration Enhancements
- **Stories:** 5 total
  1. `00-foundation-and-contract-alignment`
     - foundational contracts: caller guidance, heartbeat contract pieces, story-id validation
  2. `01-primitive-command-heartbeats`
     - heartbeats for long-running primitive commands without breaking exact JSON stdout
  3. `02-story-lead-run-surface-and-durable-ledger`
     - `story-orchestrate run/resume/status`, durable story-run state, recovery by story id
  4. `03-story-lead-acceptance-package-and-reopen-flow`
     - final package rigor, reopen/review/ruling flow, receipt/commit/cleanup handoff
  5. `04-story-lead-provider-composition-and-skill-alignment`
     - configurable story-lead provider, skill/doc alignment, smoke/gorilla proof surfaces

### What the epic was meant to deliver

The important feature is a real story-level orchestration runtime:

- `story-orchestrate run`
- `story-orchestrate resume`
- `story-orchestrate status`

That runtime was supposed to drive bounded child operations through a `StoryLeadAction` loop and return a final package with real evidence, not just assemble a package from preseeded artifacts.

---

## 3. Current state

### Done

- Stories 0-4 were implemented, verified, gated, and receipted.
- Story gates passed through Story 4.
- `npm run green-verify` is green.
- `npm run verify-all` is green.
- The local workspace also contains a validated post-story follow-up patch for several smaller contract/surface improvements.
- Cleanup was reviewed and is effectively empty:
  - [artifacts/cleanup/001-cleanup-batch.md](./artifacts/cleanup/001-cleanup-batch.md)

### Not done

Epic closeout is **blocked**.

- Epic verifier batch:
  - [artifacts/epic/001-epic-verifier-batch.json](./artifacts/epic/001-epic-verifier-batch.json)
- Epic synthesis:
  - [artifacts/epic/002-epic-synthesis.json](./artifacts/epic/002-epic-synthesis.json)

### The 4 confirmed closeout issues

1. `story-orchestrate` still does **not** run the real `StoryLeadAction` child-operation loop.
2. `story_lead_provider` is still omitted from provider-matrix / degraded-mode readiness checks.
3. Fresh story runs still do **not** include current self-review / quick-fix artifacts in final-package evidence.
4. `story-orchestrate resume` still allows an accepted attempt to run again without explicit review/ruling input.

These are the actual closeout blockers. Fix these first.

---

## 4. Important local workspace state

Do **not** assume this is a pristine post-Story-4 tree.

There is an additional validated local follow-up patch already in the worktree:

- `story_lead_provider` canonical naming + compatibility alias
- `invalid-story-run-id` contract/doc backfill
- durable review/ruling artifact refs
- maintainer/debug-only labeling for simulation switches

This patch already passed `green-verify` and `verify-all` before epic closeout started.

Before changing runtime code, run:

```bash
git status --short
git diff --stat
```

Understand that local patch first. Keep it. Do not reset or discard it.

Also present:

- untracked repo-operator docs:
  - `/Users/leemoore/code/lspec-core/AGENTS.md`
  - `/Users/leemoore/code/lspec-core/CLAUDE.md`
- untracked spec-pack runtime leftovers:
  - [impl-run.config.json](./impl-run.config.json)
  - [./.logs](./.logs)

Do **not** revert these casually. Treat them as real current workspace state.

---

## 5. First commands to run

Use the CLI to onboard yourself first.

### CLI top-level orientation

```bash
lbuild-impl
```

### Skill root onboarding

```bash
lbuild-impl skill ls-impl
```

### Skill files to read next

```bash
lbuild-impl skill ls-impl phases/20-story-cycle.md 1
lbuild-impl skill ls-impl phases/21-verification-and-fix-routing.md 1
lbuild-impl skill ls-impl phases/23-cleanup-and-closeout.md 1
lbuild-impl skill ls-impl operations/30-cli-operations.md 1
lbuild-impl skill ls-impl operations/31-provider-resolution.md 1
lbuild-impl skill ls-impl operations/33-artifact-contracts.md 1
```

If any file spans multiple chunks, continue with `2`, `3`, etc until complete.

### Spec-pack durable recovery surface

Read:

- [team-impl-log.md](./team-impl-log.md)
- [artifacts/epic/001-epic-verifier-batch.json](./artifacts/epic/001-epic-verifier-batch.json)
- [artifacts/epic/002-epic-synthesis.json](./artifacts/epic/002-epic-synthesis.json)

Do not recover from chat history. Recover from disk.

---

## 6. Onboarding reference list

Use this as your map.

### Project / runtime references

- [README.md](/Users/leemoore/code/lspec-core/README.md)
  - public CLI/SDK surface summary
- [package.json](/Users/leemoore/code/lspec-core/package.json)
  - verification scripts and package metadata
- [AGENTS.md](/Users/leemoore/code/lspec-core/AGENTS.md)
  - local project policy, including story acceptance rule
- [CLAUDE.md](/Users/leemoore/code/lspec-core/CLAUDE.md)
  - short repo-specific note for Claude Code usage

### Current-state references

- [docs/current-state.md](/Users/leemoore/code/lspec-core/docs/current-state.md)
  - current functional baseline
- [docs/current-state-code-map.md](/Users/leemoore/code/lspec-core/docs/current-state-code-map.md)
  - code map of important modules
- [docs/current-state-tech-design.md](/Users/leemoore/code/lspec-core/docs/current-state-tech-design.md)
  - current technical/release baseline
- [docs/current-state-drift-ledger.md](/Users/leemoore/code/lspec-core/docs/current-state-drift-ledger.md)
  - known drift between historical specs and current code

### Epic spec references

- [epic.md](./epic.md)
  - full epic functional contract
- [tech-design.md](./tech-design.md)
  - architecture overview and work breakdown
- [tech-design-invocation-surface.md](./tech-design-invocation-surface.md)
  - CLI / SDK surfaces and result shapes
- [tech-design-story-runtime.md](./tech-design-story-runtime.md)
  - story runtime design, including the missing `StoryLeadAction` loop
- [test-plan.md](./test-plan.md)
  - TC-to-test mapping and proof buckets
- [stories/04-story-lead-provider-composition-and-skill-alignment.md](./stories/04-story-lead-provider-composition-and-skill-alignment.md)
  - last story shard, especially the provider/proof scope wording

### Durable run state

- [team-impl-log.md](./team-impl-log.md)
  - accepted story receipts, closeout state, incidents, and epic blocker summary
- [impl-run.config.json](./impl-run.config.json)
  - active run config for this epic closeout attempt
- [artifacts/cleanup/001-cleanup-batch.md](./artifacts/cleanup/001-cleanup-batch.md)
  - explicit no-op cleanup batch
- [artifacts/epic/001-epic-verifier-batch.json](./artifacts/epic/001-epic-verifier-batch.json)
  - raw epic verifier batch results
- [artifacts/epic/002-epic-synthesis.json](./artifacts/epic/002-epic-synthesis.json)
  - consolidated closeout findings

### Runtime modules most likely to change

- [src/core/story-lead.ts](/Users/leemoore/code/lspec-core/src/core/story-lead.ts)
  - main runtime; currently scaffolded instead of running the real action loop
- [src/core/story-orchestrate-contracts.ts](/Users/leemoore/code/lspec-core/src/core/story-orchestrate-contracts.ts)
  - story runtime schemas and final-package contracts
- [src/sdk/operations/story-orchestrate.ts](/Users/leemoore/code/lspec-core/src/sdk/operations/story-orchestrate.ts)
  - run/resume/status SDK bridge and result shaping
- [src/core/provider-checks.ts](/Users/leemoore/code/lspec-core/src/core/provider-checks.ts)
  - provider readiness validation
- [src/sdk/operations/preflight.ts](/Users/leemoore/code/lspec-core/src/sdk/operations/preflight.ts)
  - preflight readiness reporting and degraded-mode notes
- [src/core/prompt-assets.ts](/Users/leemoore/code/lspec-core/src/core/prompt-assets.ts)
  - prompt-asset registration; currently missing the story-lead prompt/action surface

### Tests / proof surfaces most likely to change

- [tests/unit/core/story-lead-loop.test.ts](/Users/leemoore/code/lspec-core/tests/unit/core/story-lead-loop.test.ts)
  - currently tests scaffolded artifact behavior; will need stronger real-loop proof
- [tests/unit/sdk/story-orchestrate-resume.test.ts](/Users/leemoore/code/lspec-core/tests/unit/sdk/story-orchestrate-resume.test.ts)
  - accepted-attempt resume semantics
- [tests/integration/story-lead-provider-smoke.test.ts](/Users/leemoore/code/lspec-core/tests/integration/story-lead-provider-smoke.test.ts)
  - currently proves bootstrap/session/final-package path better than the real loop
- [tests/support/story-orchestrate-fixtures.ts](/Users/leemoore/code/lspec-core/tests/support/story-orchestrate-fixtures.ts)
  - seeded artifact fixtures used throughout story-runtime tests

### Skill references

- [src/skills/ls-impl/SKILL.md](/Users/leemoore/code/lspec-core/src/skills/ls-impl/SKILL.md)
  - root skill
- [src/skills/ls-impl/onboarding/02-terminology.md](/Users/leemoore/code/lspec-core/src/skills/ls-impl/onboarding/02-terminology.md)
  - terminology, including story-lead / impl-lead distinctions
- [src/skills/ls-impl/operations/30-cli-operations.md](/Users/leemoore/code/lspec-core/src/skills/ls-impl/operations/30-cli-operations.md)
  - CLI command semantics
- [src/skills/ls-impl/operations/31-provider-resolution.md](/Users/leemoore/code/lspec-core/src/skills/ls-impl/operations/31-provider-resolution.md)
  - provider/default-resolution assumptions
- [src/skills/ls-impl/operations/33-artifact-contracts.md](/Users/leemoore/code/lspec-core/src/skills/ls-impl/operations/33-artifact-contracts.md)
  - log/artifact contract
- [src/skills/ls-impl/phases/23-cleanup-and-closeout.md](/Users/leemoore/code/lspec-core/src/skills/ls-impl/phases/23-cleanup-and-closeout.md)
  - epic closeout process

---

## 7. The actual implementation plan

Do **not** create new stories. Treat this as epic closeout completion work.

### Batch 1 — make the runtime real

Implement these together:

1. real `StoryLeadAction` child-operation loop in `story-orchestrate`
2. accepted attempts only reopen with explicit review/ruling input
3. fresh story runs include current self-review / quick-fix evidence
4. `story_lead_provider` participates in provider readiness / preflight checks

Why this batch is one unit:

- items 2-4 all hang off the runtime behavior in item 1
- these are all in the story-runtime slice
- splitting them first just reopens the same runtime code repeatedly

### Batch 2 — proof and surface alignment

After Batch 1 lands:

1. update smoke/integration proof so it validates the real loop, not seeded-artifact scaffolding
2. update any docs/contracts that must now reflect the real runtime behavior
3. preserve the low-risk follow-up patch already in the worktree

### Then rerun closeout

```bash
npm run green-verify
npm run verify-all
lbuild-impl epic-verify --spec-pack-root docs/spec-build/epics/03-orchestration-enhancements --json
lbuild-impl epic-synthesize --spec-pack-root docs/spec-build/epics/03-orchestration-enhancements --verifier-report docs/spec-build/epics/03-orchestration-enhancements/artifacts/epic/001-epic-verifier-batch.json --json
```

Only after those pass should the final epic gate be rerun and the epic closed.

---

## 8. What not to waste time on

Not the closeout target:

- artifact flush / stale process / monitor issues
- multi-lane epic-verify hardening
- broad process redesign
- TDD/spec-process guard rails
- global-vs-local CLI dogfooding debates

Those are real, and many are already logged in `team-impl-log.md`, but they are not the reason this epic cannot close.

The closeout target is the missing integrated story-runtime behavior.

---

## 9. Practical cautions

1. **Do not trust story-level green gates as proof that the runtime is real.**
   Epic verify already proved that was insufficient.

2. **Do not revert the local follow-up patch already in the worktree.**
   It already passed validation and should be preserved.

3. **Do not confuse the scaffold with the product.**
   If a test proves only preseeded-artifact behavior, it is not enough.

4. **Do not stop at bootstrap/provider-session proof.**
   The missing value is the real child-operation loop.

---

## 10. Suggested first working sequence

1. Run:
   ```bash
   git status --short
   git diff --stat
   lbuild-impl
   lbuild-impl skill ls-impl
   ```
2. Read:
   - [team-impl-log.md](./team-impl-log.md)
   - [artifacts/epic/001-epic-verifier-batch.json](./artifacts/epic/001-epic-verifier-batch.json)
   - [artifacts/epic/002-epic-synthesis.json](./artifacts/epic/002-epic-synthesis.json)
3. Inspect:
   - [src/core/story-lead.ts](/Users/leemoore/code/lspec-core/src/core/story-lead.ts)
   - [src/sdk/operations/story-orchestrate.ts](/Users/leemoore/code/lspec-core/src/sdk/operations/story-orchestrate.ts)
   - [src/core/provider-checks.ts](/Users/leemoore/code/lspec-core/src/core/provider-checks.ts)
   - [src/sdk/operations/preflight.ts](/Users/leemoore/code/lspec-core/src/sdk/operations/preflight.ts)
   - [src/core/prompt-assets.ts](/Users/leemoore/code/lspec-core/src/core/prompt-assets.ts)
4. Implement Batch 1
5. Update proof/tests for Batch 2
6. Rerun closeout

---

## 11. Final orientation sentence

If you forget everything else: **this epic is blocked because `story-orchestrate` simulates orchestrating the story but does not actually orchestrate the story.**
