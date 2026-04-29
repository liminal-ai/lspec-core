# Gorilla Integration Pack

This directory holds the source-only release verification fixture for Story 5.

## Layout
- `fixture-spec-pack/`: the runnable spec pack and tiny target codebase.
- `.baseline/fixture-spec-pack/`: reset source used by `gorilla/reset.ts`.
- `prompt.md`: the operator prompt that walks every CLI operation.
- `evidence-template.md`: the required report shape for each gorilla run.
- `gorilla/evidence/<YYYY-MM-DD>/<provider>-<scenario>.md`: canonical release evidence layout.
- `self-test-log.md`: maintainer-only deliberate-drift sanity checks, separate from release evidence.
- `shims/codex`: a no-output shim used to force the stall scenario.

## Enums
- Providers: `claude-code`, `codex`, `copilot`
- Scenarios: `smoke`, `resume`, `structured-output`, `stall`

## Reset
Run `npx tsx gorilla/reset.ts` before a fresh gorilla pass. The reset restores `gorilla/fixture-spec-pack/` from `gorilla/.baseline/fixture-spec-pack/` byte-for-byte at the file-content level and removes any extra files created during a prior run.
