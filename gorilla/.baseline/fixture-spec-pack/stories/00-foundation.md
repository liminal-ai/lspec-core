# Story 0: Foundation and Gate Wiring

## Summary
Keep the fixture target codebase stable enough that the gorilla operator can run story and epic verification gates without hunting for missing scripts.

## Scope
- Confirm `target-codebase/package.json` exposes `green-verify` and `verify-all`.
- Keep `target-codebase/README.md` aligned with the scripts and source modules.

## Acceptance Criteria
- The target codebase documents the verification flow in plain language.
- `green-verify` validates the formatter and sample data.
- `verify-all` extends the green gate with README coverage.
