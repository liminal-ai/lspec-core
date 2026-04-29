# Release Runbook

This runbook covers the maintainer-owned steps around Story 7 release automation: configure npm once, keep release markers in sync, produce fresh gorilla evidence before tagging, rehearse the publish, and verify the first public artifact after publish.

## npm token configuration

1. Create or refresh an npm automation token with publish rights for `lbuild-impl`.
2. Add the token to the GitHub repository as the `NPM_TOKEN` Actions secret.
3. Confirm the release workflow also has the provider secrets already used by the real-harness job:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `GH_TOKEN`
4. If the token was rotated, rerun `npm whoami` locally before the next tag so the first live release is not the first auth check.

## Package access setup

`lbuild-impl` publishes as an unscoped public package. Before the first live publish:

1. Confirm the maintainer account has publish access to the `lbuild-impl` package on the npm registry.
2. Confirm the package is configured for public access (default for unscoped packages).
3. Keep `package.json`, `CHANGELOG.md`, and `VERSION` aligned to the same semantic version before tagging.

## Pre-tag gorilla evidence procedure

The publish workflow will not generate gorilla evidence for you. The maintainer must commit it before tagging.

1. Reset the fixture: `npx tsx gorilla/reset.ts`
2. Build the package: `npm run build`
3. Follow [`gorilla/prompt.md`](../../gorilla/prompt.md) and write evidence into `gorilla/evidence/<YYYY-MM-DD>/`.
   Use the fixture's `*-smoke` configs for release evidence; the non-smoke configs are intentionally allowed to run longer implementation-grade provider work.
4. Keep the canonical filename format: `<provider>-<scenario>.md`
5. The default release gate requires the canonical Story 7 matrix: `claude-code-smoke.md`, `codex-resume.md`, `copilot-structured-output.md`, and `codex-stall.md`.
6. If a release intentionally uses a smaller or different matrix, pass `--matrix <comma-separated reports>` to `scripts/check-release-evidence.ts` and document the explicit matrix in the release notes before tagging.
7. For a clean report, record `- Unexpected behaviors observed: none` in the `## Divergences` section.
8. If the gorilla run finds issues, fix them before tagging instead of committing unresolved release evidence.
9. Commit the fresh evidence directory before creating the release tag.

The publish workflow accepts evidence directories dated within the last 7 days by default. Use the workflow-dispatch `release_window_days` input only when you intentionally need a wider pre-tag window.

## First publish rehearsal

Do one rehearsal before the first live publish for a version:

1. Update `package.json`, `CHANGELOG.md`, and `VERSION` to the target version.
2. Run `npm run green-verify`.
3. Run `npm run verify-all`.
4. Run `npm run pack-and-install-smoke`.
5. Push the release branch or commit SHA you want to rehearse so GitHub Actions can check it out.
6. Optionally create a local-only `v<version>` tag for your own shell checks; the workflow does not need the tag to exist on GitHub during rehearsal.
7. Start the `Publish` workflow manually with `workflow_dispatch`, set `tag` to `v<version>`, set `ref` to the GitHub-visible release branch/SHA/ref from step 5, and leave `dry_run` enabled.
8. Confirm the workflow reaches the `npm publish --dry-run` step only after the default CI, real-harness, gorilla evidence, and version-sync checks are green.

Manual `workflow_dispatch` runs are rehearsal-only. The workflow checks out `ref`, validates the requested `tag` string, and verifies that `package.json`, `CHANGELOG.md`, and `VERSION` match that tag before running `npm publish --dry-run`. It does not require the release tag to exist on GitHub.

## Tag and publish

1. Reconfirm the release candidate commit contains:
   - the version bump in `package.json`
   - the matching top changelog entry in `CHANGELOG.md`
   - the matching value in `VERSION`
   - the fresh gorilla evidence directory committed to `gorilla/evidence/`
2. Create and push the release tag: `git tag v<version>` then `git push origin v<version>`
3. Watch the `Publish` workflow for the tagged commit.
4. If any gate fails, fix the issue on a new commit, regenerate evidence if needed, and create a new tag for the corrected version instead of rerunning an old broken tag.

## Post-publish verification

After the live publish completes:

1. In a fresh temp directory, run `npx lbuild-impl inspect --spec-pack-root ./fixture --json` against a minimal fixture pack.
2. Confirm the command returns an `inspect` envelope with `status: ok` and `outcome: ready`.
3. Confirm the persisted artifact path named in the envelope exists on disk.
4. Run `npm view lbuild-impl version` and confirm the registry version matches the pushed tag.
5. Record the first successful `npx` smoke result in the release notes or maintainer log for TC-6.7a traceability.

### v0.1.0 post-publish smoke evidence

Recorded on 2026-04-29 after the public npm publish:

- `npm view lbuild-impl version dist-tags --json` returned `version: "0.1.0"` and `latest: "0.1.0"`.
- `npx --yes lbuild-impl@0.1.0 inspect --spec-pack-root ./fixture --json` was run in a fresh temp directory against a minimal fixture pack initialized as a git repository.
- Result: exit code 0; envelope `command: "inspect"`, `version: 1`, `status: "ok"`, `outcome: "ready"`; the envelope included a persisted `result-envelope` artifact path under the temp fixture.
- A prior smoke attempt without `git init` returned a blocked envelope because the spec-pack root was not inside a git repo; the successful smoke above used the expected fixture setup.
