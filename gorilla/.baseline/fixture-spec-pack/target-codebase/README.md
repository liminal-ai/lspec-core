# Animal Summary Target Codebase

This tiny Node project is the real mutation surface for the gorilla fixture.

## Modules
- `src/report.js` formats one line per animal.
- `src/summary.js` maps raw JSON data into the summary shape the formatter expects.
- `src/index.js` wires the modules together.

## Verification
- `npm run green-verify` checks that the source modules and sample data still line up.
- `npm run verify-all` reruns the green gate and confirms this README still documents the verification flow.
