# Story 0 Parity Report

## Bundled Runtime

- Command: `bun test processes/impl-cli/tests`
- Result: `212 pass`, `0 fail`, `25 files`

## `lspec-core`

- Command: `npm test`
- Result: `225 pass`, `0 fail`, `29 files`

## Test Name Correspondence

- Status: migrated bundled suite passes intact; `lspec-core` adds 13 Story 0 structural/build/package-boundary verification tests on top
- Added Story 0 coverage:
  - `tests/smoke.test.ts`
  - `tests/foundation.test.ts`
  - `tests/verification-scripts.test.ts`
  - `tests/build-output.test.ts`

## Notes

- Bundled runtime baseline was executed from `/Users/leemoore/code/liminal-spec`.
- Standalone package suite was executed from `/Users/leemoore/code/lspec-core`.
- The pass-count delta is expected because Story 0 adds package-boundary, script-composition, and build-output coverage that does not exist in the bundled runtime suite.

## Per-file Suite Outcomes (TC-1.5a)

Fresh independent reruns completed on 2026-04-28 17:39:01 EDT for `/Users/leemoore/code/liminal-spec` at `158a16f86b03319365f4f72791291928bd71ca02` and on 2026-04-28 17:39:36 EDT for `/Users/leemoore/code/lspec-core` at `d57edc2fd0de953f85c3bd7f7929277bb99b0b4b`.

Aggregate outcome: bundled suite `212 pass / 0 fail / 25 files`; migrated suite `225 pass / 0 fail / 29 files`.

### Bundled Suite: `liminal-spec/processes/impl-cli/tests/`

| File | Pass | Fail | Notes |
| --- | ---: | ---: | --- |
| `processes/impl-cli/tests/artifact-writer.test.ts` | 2 | 0 | Matches `lspec-core/tests/artifact-writer.test.ts`. |
| `processes/impl-cli/tests/cli-io-contract.test.ts` | 2 | 0 | Matches `lspec-core/tests/cli-io-contract.test.ts`. |
| `processes/impl-cli/tests/cli-operations-doc.test.ts` | 10 | 0 | Matches `lspec-core/tests/cli-operations-doc.test.ts`. |
| `processes/impl-cli/tests/codex-output-schema.test.ts` | 2 | 0 | Matches `lspec-core/tests/codex-output-schema.test.ts`. |
| `processes/impl-cli/tests/command-errors.test.ts` | 2 | 0 | Matches `lspec-core/tests/command-errors.test.ts`. |
| `processes/impl-cli/tests/config-schema.test.ts` | 15 | 0 | Matches `lspec-core/tests/config-schema.test.ts`. |
| `processes/impl-cli/tests/epic-cleanup-command.test.ts` | 8 | 0 | Matches `lspec-core/tests/epic-cleanup-command.test.ts`. |
| `processes/impl-cli/tests/epic-synthesize-command.test.ts` | 10 | 0 | Matches `lspec-core/tests/epic-synthesize-command.test.ts`. |
| `processes/impl-cli/tests/epic-verify-command.test.ts` | 7 | 0 | Matches `lspec-core/tests/epic-verify-command.test.ts`. |
| `processes/impl-cli/tests/gate-discovery.test.ts` | 9 | 0 | Matches `lspec-core/tests/gate-discovery.test.ts`. |
| `processes/impl-cli/tests/inspect-command.test.ts` | 10 | 0 | Matches `lspec-core/tests/inspect-command.test.ts`. |
| `processes/impl-cli/tests/log-template-contract.test.ts` | 5 | 0 | Matches `lspec-core/tests/log-template-contract.test.ts`. |
| `processes/impl-cli/tests/preflight-command.test.ts` | 15 | 0 | Matches `lspec-core/tests/preflight-command.test.ts`. |
| `processes/impl-cli/tests/prompt-assembly.test.ts` | 16 | 0 | Matches `lspec-core/tests/prompt-assembly.test.ts`. |
| `processes/impl-cli/tests/prompt-asset-contract.test.ts` | 10 | 0 | Matches `lspec-core/tests/prompt-asset-contract.test.ts`. |
| `processes/impl-cli/tests/provider-adapter.test.ts` | 15 | 0 | Matches `lspec-core/tests/provider-adapter.test.ts`. |
| `processes/impl-cli/tests/quick-fix-command.test.ts` | 11 | 0 | Matches `lspec-core/tests/quick-fix-command.test.ts`. |
| `processes/impl-cli/tests/result-contracts.test.ts` | 13 | 0 | Matches `lspec-core/tests/result-contracts.test.ts`. |
| `processes/impl-cli/tests/runtime-progress.test.ts` | 5 | 0 | Matches `lspec-core/tests/runtime-progress.test.ts`. |
| `processes/impl-cli/tests/security-guardrails.test.ts` | 8 | 0 | Matches `lspec-core/tests/security-guardrails.test.ts`. |
| `processes/impl-cli/tests/story-continue-command.test.ts` | 8 | 0 | Matches `lspec-core/tests/story-continue-command.test.ts`. |
| `processes/impl-cli/tests/story-implement-command.test.ts` | 11 | 0 | Matches `lspec-core/tests/story-implement-command.test.ts`. |
| `processes/impl-cli/tests/story-order.test.ts` | 1 | 0 | Matches `lspec-core/tests/story-order.test.ts`. |
| `processes/impl-cli/tests/story-self-review-command.test.ts` | 7 | 0 | Matches `lspec-core/tests/story-self-review-command.test.ts`. |
| `processes/impl-cli/tests/story-verify-command.test.ts` | 10 | 0 | Matches `lspec-core/tests/story-verify-command.test.ts`. |

### Migrated Suite: `lspec-core/tests/`

| File | Pass | Fail | Notes |
| --- | ---: | ---: | --- |
| `tests/artifact-writer.test.ts` | 2 | 0 | Matches `liminal-spec/processes/impl-cli/tests/artifact-writer.test.ts`. |
| `tests/build-output.test.ts` | 1 | 0 | Story 0-only standalone package coverage. |
| `tests/cli-io-contract.test.ts` | 2 | 0 | Matches `liminal-spec/processes/impl-cli/tests/cli-io-contract.test.ts`. |
| `tests/cli-operations-doc.test.ts` | 10 | 0 | Matches `liminal-spec/processes/impl-cli/tests/cli-operations-doc.test.ts`. |
| `tests/codex-output-schema.test.ts` | 2 | 0 | Matches `liminal-spec/processes/impl-cli/tests/codex-output-schema.test.ts`. |
| `tests/command-errors.test.ts` | 2 | 0 | Matches `liminal-spec/processes/impl-cli/tests/command-errors.test.ts`. |
| `tests/config-schema.test.ts` | 15 | 0 | Matches `liminal-spec/processes/impl-cli/tests/config-schema.test.ts`. |
| `tests/epic-cleanup-command.test.ts` | 8 | 0 | Matches `liminal-spec/processes/impl-cli/tests/epic-cleanup-command.test.ts`. |
| `tests/epic-synthesize-command.test.ts` | 10 | 0 | Matches `liminal-spec/processes/impl-cli/tests/epic-synthesize-command.test.ts`. |
| `tests/epic-verify-command.test.ts` | 7 | 0 | Matches `liminal-spec/processes/impl-cli/tests/epic-verify-command.test.ts`. |
| `tests/foundation.test.ts` | 7 | 0 | Story 0-only standalone package coverage. |
| `tests/gate-discovery.test.ts` | 9 | 0 | Matches `liminal-spec/processes/impl-cli/tests/gate-discovery.test.ts`. |
| `tests/inspect-command.test.ts` | 10 | 0 | Matches `liminal-spec/processes/impl-cli/tests/inspect-command.test.ts`. |
| `tests/log-template-contract.test.ts` | 5 | 0 | Matches `liminal-spec/processes/impl-cli/tests/log-template-contract.test.ts`. |
| `tests/preflight-command.test.ts` | 15 | 0 | Matches `liminal-spec/processes/impl-cli/tests/preflight-command.test.ts`. |
| `tests/prompt-assembly.test.ts` | 16 | 0 | Matches `liminal-spec/processes/impl-cli/tests/prompt-assembly.test.ts`. |
| `tests/prompt-asset-contract.test.ts` | 10 | 0 | Matches `liminal-spec/processes/impl-cli/tests/prompt-asset-contract.test.ts`. |
| `tests/provider-adapter.test.ts` | 15 | 0 | Matches `liminal-spec/processes/impl-cli/tests/provider-adapter.test.ts`. |
| `tests/quick-fix-command.test.ts` | 11 | 0 | Matches `liminal-spec/processes/impl-cli/tests/quick-fix-command.test.ts`. |
| `tests/result-contracts.test.ts` | 13 | 0 | Matches `liminal-spec/processes/impl-cli/tests/result-contracts.test.ts`. |
| `tests/runtime-progress.test.ts` | 5 | 0 | Matches `liminal-spec/processes/impl-cli/tests/runtime-progress.test.ts`. |
| `tests/security-guardrails.test.ts` | 8 | 0 | Matches `liminal-spec/processes/impl-cli/tests/security-guardrails.test.ts`. |
| `tests/smoke.test.ts` | 1 | 0 | Story 0-only standalone package coverage. |
| `tests/story-continue-command.test.ts` | 8 | 0 | Matches `liminal-spec/processes/impl-cli/tests/story-continue-command.test.ts`. |
| `tests/story-implement-command.test.ts` | 11 | 0 | Matches `liminal-spec/processes/impl-cli/tests/story-implement-command.test.ts`. |
| `tests/story-order.test.ts` | 1 | 0 | Matches `liminal-spec/processes/impl-cli/tests/story-order.test.ts`. |
| `tests/story-self-review-command.test.ts` | 7 | 0 | Matches `liminal-spec/processes/impl-cli/tests/story-self-review-command.test.ts`. |
| `tests/story-verify-command.test.ts` | 10 | 0 | Matches `liminal-spec/processes/impl-cli/tests/story-verify-command.test.ts`. |
| `tests/verification-scripts.test.ts` | 4 | 0 | Story 0-only standalone package coverage. |

### Cross-suite test-name correspondence

Every bundled-suite test name has a corresponding migrated-suite test name after normalizing Bun `classname + name` pairs against Vitest test names: `0` missing bundled names out of `212` checked.

The migrated suite adds `13` standalone-package-only test names across `tests/build-output.test.ts`, `tests/foundation.test.ts`, `tests/smoke.test.ts`, and `tests/verification-scripts.test.ts`.
