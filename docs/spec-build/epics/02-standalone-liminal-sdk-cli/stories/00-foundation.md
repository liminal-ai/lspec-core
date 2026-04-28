# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->

Move the bundled runtime from `liminal-spec/processes/impl-cli/` into the new `lspec-core` repo at the repo root, replace the Bun-coupled toolchain with a portable Node 24 + Vitest stack, and re-establish test parity without changing runtime behavior.

### Description
<!-- Jira: Description field -->

**User Profile:** Liminal Spec maintainer publishing the implementation runtime as a reusable npm package

**Objective:** Establish the standalone package boundary, portable toolchain, and verification baseline that every later story depends on.

**Pre-existing foundation:** The package boundary in `lspec-core` is already scaffolded as of the initial repo commit. Specifically:

| Element | Status at story start |
|---|---|
| `package.json` (with `@lspec/core` identity, Node 24 engines, dependency pins) | Present |
| `tsconfig.json`, `vitest.config.ts`, `tsup.config.ts`, `biome.json` | Present |
| Stub `src/sdk/index.ts` and `src/bin/lspec.ts`, single smoke test under `tests/` | Present |
| Base npm scripts: `format:check`, `format`, `lint`, `check`, `typecheck`, `test`, `test:watch`, `build` | Present |
| Verify-chain scripts: `red-verify`, `verify`, `green-verify`, `verify-all` | NOT YET — Story 0 defines these |
| Test-immutability guard scripts: `capture:test-baseline`, `guard:no-test-changes` | NOT YET — Story 0 defines these |
| Per-operation test files (~26 files) and migrated source under `src/core/`, `src/infra/` | NOT YET — Story 0 migrates these |
| `.github/workflows/ci.yml` | NOT YET — Story 0 creates this (the `.github/workflows/` directory does not exist at story start) |

Story 0 extends this baseline; it does not create the package boundary from scratch.

**Scope In:**
- Migrate runtime source from `liminal-spec/processes/impl-cli/src/` into the pre-existing `src/` tree (organize under `src/core/`, `src/bin/`, `src/sdk/` per the tech design)
- Migrate test suite from `liminal-spec/processes/impl-cli/tests/` into the pre-existing `tests/` tree
- Convert all `bun:test` imports to `vitest` (and adapt any Bun-specific test helpers to vitest equivalents)
- Replace the stub `src/sdk/index.ts` and `src/bin/lspec.ts` with the real SDK and CLI entry points wired to the migrated source
- Define the verify-script chain on top of the pre-existing base scripts: `red-verify`, `verify`, `green-verify`, `verify-all`, plus the `capture:test-baseline` and `guard:no-test-changes` scripts that compose into them
- Confirm the pre-scaffolded `tsup.config.ts` produces correct `.d.ts` and ESM output for the migrated source; extend if needed
- Create `.github/workflows/ci.yml` that runs `npm run verify` on `push` and `pull_request`, using Node 24 + npm. The `.github/workflows/` directory does not exist at story start; this story creates both the directory and the file.
- Prove Story 0 parity against the existing bundled runtime suite via the maintainer-run TC-1.5a procedure

**Scope Out:**
- Intentional runtime behavior changes
- Contract hardening and regression fixes from later stories
- Skill migration to the published package
- Package boundary creation (already scaffolded — see "Pre-existing foundation" above)

**Dependencies:**
- Existing `liminal-spec/processes/impl-cli/` source and test suite remain available as the parity baseline
- Pre-scaffolded package boundary in `lspec-core` (validated locally: install / typecheck / lint / format / test / build all pass before this story starts)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-1.1:** The runtime source lives in a single dedicated package directory containing `src/`, `tests/`, `package.json`, build configuration, and verification scripts.

- **TC-1.1a:** Package directory layout
  - Given: The repository at the end of this story
  - When: A reviewer inspects the package directory
  - Then: `src/`, `tests/`, `package.json`, `tsconfig.json`, and a Vitest configuration file are all present
- **TC-1.1b:** Existing bundled runtime untouched
  - Given: The `liminal-spec` repo's `processes/impl-cli/` and `processes/codex-impl/` directories before and after this story
  - When: A reviewer compares those directories' contents between the two states
  - Then: No file in either directory has been modified

**AC-1.2:** Vitest replaces `bun:test` as the test runner across the new package.

- **TC-1.2a:** No `bun:test` imports remain
  - Given: The new package source tree
  - When: A grep is run for `bun:test`
  - Then: No matches are found in `src/` or `tests/`
- **TC-1.2b:** Vitest config exists and tests run under it
  - Given: The new package
  - When: The Vitest test command is invoked
  - Then: The full test suite runs to completion without runner-level errors

**AC-1.3:** The package defines verification scripts at the four standard tiers.

- **TC-1.3a:** Verification tiers defined
  - Given: The new `package.json`
  - When: A reviewer inspects the `scripts` block
  - Then: `red-verify`, `verify`, `green-verify`, and `verify-all` scripts are all defined
- **TC-1.3b:** Each tier composes correctly
  - Given: The verification scripts
  - When: Each tier is invoked in a clean checkout
  - Then: `red-verify` runs format, lint, and typecheck; `verify` adds the test suite; `green-verify` adds a test-immutability guard; `verify-all` adds the integration and end-to-end suites or a clear placeholder notice

**AC-1.4:** The new package builds to portable JavaScript and TypeScript declaration files.

- **TC-1.4a:** Build output produced
  - Given: A clean package
  - When: The build command is invoked
  - Then: A `dist/` directory is produced containing JavaScript and `.d.ts` files for both the CLI bin entry and the SDK entry
- **TC-1.4b:** Build output runs under Node
  - Given: A built `dist/`
  - When: The CLI bin is invoked through Node directly
  - Then: It prints help text or runs the requested subcommand without runtime errors

**AC-1.5:** The new package's test suite reaches behavioral parity with the existing bundled runtime suite at the migration's exit point. Later stories intentionally change tested behavior through hardening and regression fixes; this AC covers Story 0's exit state only.

- **TC-1.5a:** Maintainer-run parity check at Story 0 exit
  - Given: The bundled runtime tests in `liminal-spec/processes/impl-cli/tests/` and the migrated tests in `lspec-core/tests/` at the conclusion of Story 0, before any hardening or regression-fix work has begun
  - When: The maintainer runs both suites independently — `bun test processes/impl-cli/tests` from the `liminal-spec` repo and `npm test` from the `lspec-core` repo — and records each suite's pass count, fail count, and per-file outcomes
  - Then: Every test name in the bundled suite has a corresponding test name in the migrated suite (added structural tests in the migrated suite are permitted on top); both suites pass with zero failures; the parity record is documented in the Story 0 receipt or a `parity-report.md` artifact under `docs/spec-build/epics/02-standalone-liminal-sdk-cli/`. This check runs out of band as a one-shot maintainer activity; no runtime test inside `lspec-core` spawns the bundled suite as a subprocess.
- **TC-1.5b:** Intentional divergence allowed in later stories
  - Given: The new package after Story 3's hardening and regression fixes have been applied
  - When: A reviewer compares the new suite against the bundled suite
  - Then: Divergences are permitted where Story 3 explicitly changed behavior; each divergence is traceable to an AC in Flow 4

**AC-1.6:** A default-CI GitHub Actions workflow exists at `.github/workflows/ci.yml` and runs the verify chain on every push and pull request.

- **TC-1.6a:** ci.yml exists and triggers correctly
  - Given: The `lspec-core` repository at the end of this story
  - When: A reviewer inspects `.github/workflows/ci.yml`
  - Then: The file exists; its `on:` block triggers on `push` and `pull_request`; the job runs on Node 24 with npm and invokes `npm run verify`. (`.github/workflows/` did not exist at story start; this story creates the directory and the file.)

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

**Relevant boundary contracts**

**Operation Inventory**

| Operation | Purpose | Continuation Handle |
|-----------|---------|---------------------|
| inspect | Validate spec pack and return inventory | no |
| preflight | Resolve provider availability and verification gates | no |
| epic-synthesize | Generate or refresh epic-level synthesis output | no |
| epic-verify | Run epic-level verification | no |
| epic-cleanup | Run pre-epic-verification cleanup | no |
| quick-fix | Apply a one-shot fix | no |
| story-implement | Implement a single story | yes |
| story-continue | Resume implementation from a continuation handle | yes |
| story-self-review | Run N self-review passes on a story | yes |
| story-verify | Run story-level verification | no |

**Package Distribution Surface**

| Concern | Specification |
|---------|---------------|
| Bin entry | One bin entry mapped to the CLI's compiled entry point |
| SDK default export | Operation functions, result types, and error classes as named exports |
| Subpath exports | Distinct entries for the SDK and any auxiliary surfaces (contracts/types) so consumers can import contracts without pulling in operations |
| Type emission | `.d.ts` files generated for both the bin entry point and every public SDK export |
| Files allowlist | `dist/`, `README`, `LICENSE`, `CHANGELOG`; no source, tests, or fixtures shipped |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] The `lspec-core` repo root contains the expected package baseline structure (`src/`, `tests/`, `package.json`, `tsconfig.json`, `vitest.config.ts`)
- [ ] No `bun:test` imports remain in the new package
- [ ] All four verification tiers are defined and runnable
- [ ] Build emits portable JS and `.d.ts` files
- [ ] `.github/workflows/ci.yml` exists, triggers on push + PR, runs `npm run verify` on Node 24 + npm
- [ ] Story 0 parity against the bundled runtime suite is documented
- [ ] No file under `liminal-spec/processes/impl-cli/` or `liminal-spec/processes/codex-impl/` was modified
