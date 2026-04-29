# Story 3: Smoke Continuation Probe

## Summary
Exercise provider structured output and continuation handling without requiring a code change.

## Scope
- Inspect the tiny target codebase and confirm the verification scripts are present.
- Do not edit files unless the verification scripts are missing or obviously broken.
- Keep any reported change list empty when no edit is needed.

## Acceptance Criteria
- The provider returns a valid structured envelope.
- A continuation handle can be reused by `story-continue`.
- `green-verify` and `verify-all` remain the only gates that need to be mentioned.
