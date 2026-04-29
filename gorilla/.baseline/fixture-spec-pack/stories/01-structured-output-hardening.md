# Story 1: Structured Output Hardening

## Summary
Improve the animal summary output so provider-backed edits can point at a small, concrete code surface.

## Scope
- Maintain `target-codebase/src/report.js` and `target-codebase/src/summary.js`.
- Preserve the JSON shape in `target-codebase/data/animals.json`.
- Keep the README examples accurate after any fix.

## Acceptance Criteria
- The report formatter still returns a stable per-animal summary string.
- The summary helper preserves `name`, `species`, and `habitat`.
- Verification gates catch malformed data or missing exports.
