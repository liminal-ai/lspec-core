# Gorilla Evidence: Story-Lead Provider Smoke

## Purpose

Record the durable proof for TC-5.4a and TC-5.4b: Claude Code and Codex story-lead selection smoke tests both executed and reached terminal outcomes with durable artifact assertions.

## Evidence Record

Date: 2026-05-02

Command:

```bash
LSPEC_INTEGRATION=1 npx vitest run --project integration tests/integration/story-lead-provider-smoke.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests  2 passed (2)
Duration  12.48s
```

Observed scope:

- The integration smoke file executed the Claude Code story-lead selection case.
- The integration smoke file executed the Codex story-lead selection case.
- Both cases asserted that the story-lead flow reached a terminal outcome and that the durable artifact assertions passed.

## Pass Criteria

The evidence passes when the integration command above reports one passing test file and two passing tests, covering both provider smoke cases.
