# Claude Code Notes For lbuild-impl

Read [AGENTS.md](AGENTS.md) first.

When dogfooding `lbuild-impl` in this repo:
- global `lbuild-impl` = published surface
- `npm exec -- lbuild-impl` / `node dist/bin/lbuild-impl.js` = current branch surface

Use the local CLI for unreleased commands. Use the global install only when you intentionally want published behavior.

Targeted test slices: `bun run test -- --run <files>` (Vitest). Never use raw `bun test`; it invokes Bun's runner and can bypass repo Vitest config.
