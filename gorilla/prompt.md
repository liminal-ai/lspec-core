# Gorilla Prompt

Use the built package against the source-only fixture and record evidence in the canonical layout.

## Setup
1. Run `npx tsx gorilla/reset.ts`.
2. Run `npm run build`.
3. Set `CLI="node ./dist/bin/lspec.js"`.
4. Set `SPEC="./gorilla/fixture-spec-pack"`.
5. Create today's evidence directory: `mkdir -p "gorilla/evidence/<YYYY-MM-DD>"`.

## Canonical Evidence Layout
- Write one Markdown file per scenario under `gorilla/evidence/<YYYY-MM-DD>/<provider>-<scenario>.md`.
- `<provider>` must be one of `claude-code`, `codex`, `copilot`.
- `<scenario>` must be one of `smoke`, `resume`, `structured-output`, `stall`.
- Do not write deliberate-drift sanity checks into `gorilla/evidence/`; record them in `gorilla/self-test-log.md`.

## Operation Matrix

### Claude Code smoke
- `inspect`: `$CLI inspect --spec-pack-root "$SPEC" --json`
- `preflight`: `$CLI preflight --spec-pack-root "$SPEC" --config "$SPEC/impl-run.claude.json" --json`
- `story-implement`: `$CLI story-implement --spec-pack-root "$SPEC" --story-id 01-structured-output-hardening --config "$SPEC/impl-run.claude.json" --json`
- `story-self-review`: rerun with the continuation handle returned by `story-implement` via `$CLI story-self-review --spec-pack-root "$SPEC" --story-id 01-structured-output-hardening --provider <provider> --session-id <sessionId> --passes 1 --config "$SPEC/impl-run.claude.json" --json`
- `story-verify`: `$CLI story-verify --spec-pack-root "$SPEC" --story-id 01-structured-output-hardening --config "$SPEC/impl-run.claude.json" --json`

Save the smoke report to `gorilla/evidence/<YYYY-MM-DD>/claude-code-smoke.md`.

### Codex resume
- `story-implement`: `$CLI story-implement --spec-pack-root "$SPEC" --story-id 02-release-evidence-polish --config "$SPEC/impl-run.codex.json" --json`
- `story-continue`: reuse the returned continuation handle with `$CLI story-continue --spec-pack-root "$SPEC" --story-id 02-release-evidence-polish --provider <provider> --session-id <sessionId> --followup-text "Summarize what changed and what still needs verification." --config "$SPEC/impl-run.codex.json" --json`
- `epic-verify`: `$CLI epic-verify --spec-pack-root "$SPEC" --config "$SPEC/impl-run.codex.json" --json`
- `epic-synthesize`: `$CLI epic-synthesize --spec-pack-root "$SPEC" --config "$SPEC/impl-run.codex.json" --verifier-report "$SPEC/seed-verifier-reports/claude-code-pass.md" --verifier-report "$SPEC/seed-verifier-reports/codex-revise.md" --json`

Save the resume report to `gorilla/evidence/<YYYY-MM-DD>/codex-resume.md`.

### Copilot structured-output
- `quick-fix`: `$CLI quick-fix --spec-pack-root "$SPEC" --config "$SPEC/impl-run.copilot.json" --working-directory "$SPEC/target-codebase" --request-text "Tighten the README verification wording without changing behavior." --json`
- `epic-cleanup`: `$CLI epic-cleanup --spec-pack-root "$SPEC" --cleanup-batch "$SPEC/seed-cleanup-batches/cleanup-batch-01.md" --config "$SPEC/impl-run.copilot.json" --json`

Save the structured-output report to `gorilla/evidence/<YYYY-MM-DD>/copilot-structured-output.md`.

### Codex stall
1. Export `PATH="$(pwd)/gorilla/shims:$PATH"` so the local `codex` shim is chosen first.
2. Run `$CLI story-implement --spec-pack-root "$SPEC" --story-id 00-foundation --config "$SPEC/impl-run.stall.json" --json`.
3. Confirm the envelope surfaces a blocked stall outcome rather than hanging indefinitely.
4. Reset `PATH` after the run.

Save the stall report to `gorilla/evidence/<YYYY-MM-DD>/codex-stall.md`.

## Evidence Expectations
- Use `gorilla/evidence-template.md` for every report.
- Record the exact command you ran for each operation.
- Include the returned envelope status and outcome.
- Verify the persisted artifact path on disk for each operation.
- When a continuation handle appears, record whether you exercised it.
- If expected and actual shapes diverge, call that out explicitly under divergences.

## Deliberate Drift Self-Test
Introduce one known parser mismatch, rerun the affected path, confirm the divergence is surfaced, then document the result in `gorilla/self-test-log.md`.
