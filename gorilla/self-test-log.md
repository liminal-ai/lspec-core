# Gorilla Self-Test Log

Record maintainer-driven deliberate-drift checks here. These notes are for sanity-checking the gorilla pack itself and are separate from release evidence.

## Template
- Date:
- Drift introduced:
- Operation rerun:
- Expected divergence:
- Observed divergence:
- Follow-up:

## 2026-04-29 Codex Smoke Parser Drift
- Date: 2026-04-29
- Provider/scenario altered: `codex` / `smoke`
- Fixture altered temporarily: `tests/parser-contract/fixtures/codex/smoke.txt`
- One-word change made: changed the nested payload field from `"scenario":"smoke"` to `"scenario":"drift"`.
- Pre-drift hash: `59dd7a7814bda19ee88991e35180354d4ed8356350dbc8869dd2c896c378a262`
- Drift command: `npx vitest run --project default tests/parser-contract/codex.test.ts`
- Drift result: failed as expected with one failing test and three passing tests.

Key failure lines:

```text
FAIL  |default| tests/parser-contract/codex.test.ts > codex parser-contract fixtures > TC-5.3a/TC-5.3b: smoke captured output parses through the production parser with exact parsed-shape diffs
AssertionError: expected 'Provider output did not match the exp...' to be undefined
Received:
"Provider output did not match the expected JSON payload. direct payload: scenario: Invalid input: expected \"smoke\""
```

Expected vs observed:

```text
Expected parsed shape: { ok: true, provider: "codex", scenario: "smoke" }
Observed drifted shape: { ok: true, provider: "codex", scenario: "drift" }
Detected difference: scenario literal no longer matched the captured-output contract.
```

Revert confirmation:
- The drift change was reverted and the fixture returned to hash `59dd7a7814bda19ee88991e35180354d4ed8356350dbc8869dd2c896c378a262`.
- `npx vitest run --project default tests/parser-contract/codex.test.ts` passed after the revert with 4 passing tests.
