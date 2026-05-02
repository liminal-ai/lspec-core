# lbuild-impl Agent Notes

## Verification

```bash
npm run red-verify
npm run green-verify
npm run verify-all
```

For `lbuild-impl` in this repo:
- story gate: `npm run green-verify`
- epic gate: `npm run verify-all`
- targeted unit slices: `bun run test -- --run <files>` (Vitest). Never use raw `bun test`; it invokes Bun's runner and can bypass repo Vitest config.

Story acceptance requires:
1. `story-verify` = `pass`
2. `npm run green-verify` passes
3. `npm run verify-all` passes
4. receipt complete
5. story commit landed

## Dogfooding lbuild-impl Here

- global `lbuild-impl` = published CLI on `PATH`
- local CLI = `npm exec -- lbuild-impl` or `node dist/bin/lbuild-impl.js`

Use the local CLI for unreleased commands on the current branch. Do not treat missing unreleased commands on the global install as a product defect.
