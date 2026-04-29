# Animal Summary Target Codebase

This tiny Node project is the real mutation surface for the gorilla fixture. `src/report.js` formats one line per animal, `src/summary.js` maps the sample JSON into that shape, and `src/index.js` wires the modules together. Run `npm run green-verify` to confirm the modules and sample data still line up, then run `npm run verify-all` to rerun that gate and confirm this README still documents the verification flow.
