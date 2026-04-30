# Current State Drift Ledger

Generated: 2026-04-30

This ledger records the main places where implemented reality has intentionally moved beyond, narrowed, or corrected the historical epic docs.

## Package Identity

Historical drafts used broader standalone SDK/CLI naming. Current package identity is the unscoped public npm package `lbuild-impl`, with CLI binary `lbuild-impl`.

## Version Status

The package release marker is `0.2.1`. Any doc that still describes the project as only `0.1.0` or first-publish pending is stale.

## Test Topology

The current test layout is tier-first:

- `tests/unit/**`
- `tests/package/**`
- `tests/integration/**`
- `tests/support/**`

Historical paths that referenced flatter test locations should be treated as acceptance traceability, not current navigation.

## CI Runner

Active GitHub Actions workflows now run on Blacksmith with `blacksmith-2vcpu-ubuntu-2404`. Historical references to `ubuntu-latest` are no longer current.

## Release Evidence Scope

The release gorilla gate enforces a bounded four-report matrix:

- `claude-code-smoke.md`
- `codex-resume.md`
- `copilot-structured-output.md`
- `codex-stall.md`

Earlier provider-by-scenario wording in the epic design should be read as the broader gorilla capability, not the current release gate.

## Manual Publish Rehearsal

Manual publish workflow runs validate a GitHub-visible ref and never publish live. If the requested version already exists on npm, the manual dry-run path uses `npm pack --dry-run --json` to validate package shape instead of attempting `npm publish --dry-run` for an already-published version.

## Provider CLI Choice

Copilot integration currently uses the standalone `copilot` binary installed from `@github/copilot`, not the older `gh copilot` extension assumption.

## Runtime Contract Fixes

The current implementation has the corrected runtime behavior expected after release hardening:

- `inspect` is read-only.
- Internal/programming failures classify as `error`, not `blocked`.
- Caller-provided environment overrides win explicitly.
- Atomic writes sync the temp file before rename.
- Public version surfaces read package metadata instead of hardcoded stale literals.
- Lint is clean under the current gate.

## Release Evidence And CI Evidence

The latest verified release automation evidence is:

- CI: GitHub Actions run `25141574466`
- Integration: GitHub Actions run `25141423544`
- Publish dry-run: GitHub Actions run `25141577186`
- Live `v0.2.0` publish: GitHub Actions run `25139094562`
