# Current State: lbuild-impl

Generated: 2026-04-30

This is a Config A compact current-state baseline. The repository is small enough that one functional baseline, one technical baseline, one code map, and one drift ledger are more useful than a large reconstructed architecture packet.

## Status

`lbuild-impl` is a standalone Node 24+ npm package that exposes the Liminal Build implementation runtime as both a CLI and SDK. The current release marker is `lbuild-impl@0.2.2`.

The package is no longer just an epic artifact. It has a tested distribution surface, real-provider integration gates, committed gorilla release evidence, and a live publish workflow.

Recent release evidence:

- GitHub Actions CI on Blacksmith succeeded in run `25141574466`.
- Manual Integration on Blacksmith succeeded in run `25141423544`.
- Manual Publish dry-run on Blacksmith succeeded in run `25141577186`.
- Live `v0.2.0` publish succeeded in run `25139094562`.

## Functional Baseline

The CLI binary is `lbuild-impl`. The SDK exports the same operation family through `lbuild-impl/sdk`.

Current operations:

- `inspect`
- `preflight`
- `story-implement`
- `story-continue`
- `story-self-review`
- `story-verify`
- `quick-fix`
- `epic-verify`
- `epic-synthesize`
- `epic-cleanup`

Each operation returns or prints a versioned result envelope. Envelopes carry the command name, status, outcome, error details when applicable, warnings, artifact references, timestamps, and operation-specific data.

The implementation runtime writes durable artifacts under the spec pack. `inspect` is intentionally read-only. Mutating operations reserve artifact paths, write through atomic helpers, and preserve continuation/progress information where the operation supports it.

Provider-backed operations support Claude Code, Codex, and Copilot through provider adapters. Real-provider tests are gated by `LSPEC_INTEGRATION=1` and the required provider credentials.

## Release Baseline

The active release path is documented in `docs/release-runbook.md`.

Release automation uses:

- Node 24.
- Blacksmith runner label `blacksmith-2vcpu-ubuntu-2404`.
- Default CI gate: `npm run verify` plus `npm run test:package`.
- Real-provider gate: `npm run test:integration`.
- Gorilla evidence gate: `scripts/check-release-evidence.ts`.
- Version sync gate: `scripts/check-release-version-sync.ts`.
- Live publish on tag push with `npm publish --access public`.

Manual `workflow_dispatch` publish runs are rehearsal-only. They validate the release candidate and run dry-run publication logic. If the requested package version already exists on npm, the workflow validates package shape with `npm pack --dry-run --json` instead of trying to republish the existing version.

## Test Baseline

Tests are organized by execution tier:

- `tests/unit/**`: default local and CI tests.
- `tests/package/**`: package shape, release workflow, distribution, and runbook tests.
- `tests/integration/**`: real-provider harness tests.
- `tests/support/**`: shared helpers and fixtures.

Common gates:

- `npm run verify`: format check, lint, typecheck, captured baseline guard, and unit tests.
- `npm run test:package`: package/release tests.
- `npm run test:integration`: real-provider integration tests.
- `npm run verify-all`: default, package, and integration gates.
- `npm run pack-and-install-smoke`: local package install smoke.

## Read Path

For current implementation work, read these first:

1. `docs/current-state.md`
2. `docs/current-state-tech-design.md`
3. `docs/current-state-code-map.md`
4. `docs/release-runbook.md`
5. `gorilla/README.md` and `gorilla/prompt.md` for release evidence work

The original epic docs under `docs/spec-build/epics/02-standalone-liminal-sdk-cli/` remain useful for historical intent and acceptance traceability. When they disagree with current-state docs, current code, tests, and workflows are the source of truth.
