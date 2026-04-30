# Changelog

## 0.2.1 - 2026-04-30

- Reworks the root CLI help into an agent-oriented onboarding screen that appears for no args, `-h`, and `--help`.
- Clarifies the relationship between `liminal-spec` spec packs and `lbuild-impl` story build/verify workflows.
- Refreshes README, current-state docs, and the release runbook after the initial public publish and Blacksmith CI migration.
- Loosens help-output tests so they guard CLI behavior without freezing specific help wording.

## 0.2.0 - 2026-04-29

- Hardens release gates with strict real-provider auth behavior, package-shape testing, runtime version sync, and a coherent manual dry-run workflow.
- Makes CLI/SDK contracts safer: read-only `inspect`, unknown flag rejection, corrected internal-error classification, env override semantics, and richer provider diagnostics.
- Adds bounded gorilla smoke configs and real four-report release evidence for Claude Code, Codex, Copilot, and stall handling.
- Improves durability and artifact hygiene with fsynced atomic writes and stale reservation cleanup.
- Reconciles epic/spec/test-plan docs with the implemented `lbuild-impl` package, release matrix, and three-project Vitest topology.

## 0.1.0 - 2026-04-29

- First public release of `lbuild-impl`.
- Ships the standalone CLI and SDK runtime, real-provider verification layers, and release automation.
