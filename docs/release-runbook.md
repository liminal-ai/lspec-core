# Release Runbook

This runbook covers the maintainer-owned steps around Story 7 release automation: configure npm once, keep release markers in sync, produce fresh gorilla evidence before tagging, rehearse the publish, and verify the first public artifact after publish.

## npm token configuration

1. Create or refresh an npm automation token with publish rights for `@lspec/core`.
2. Add the token to the GitHub repository as the `NPM_TOKEN` Actions secret.
3. Confirm the release workflow also has the provider secrets already used by the real-harness job:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `GH_TOKEN`
4. If the token was rotated, rerun `npm whoami` locally before the next tag so the first live release is not the first auth check.

## Scoped organization setup

`@lspec/core` publishes under the `@lspec` scope. Before the first live publish:

1. Confirm the `@lspec` npm organization exists and the maintainer account has publish access.
2. Confirm the package is configured for public access under the scope.
3. Keep `package.json`, `CHANGELOG.md`, and `VERSION` aligned to the same semantic version before tagging.

## Pre-tag gorilla evidence procedure

The publish workflow will not generate gorilla evidence for you. The maintainer must commit it before tagging.

1. Reset the fixture: `npx tsx gorilla/reset.ts`
2. Build the package: `npm run build`
3. Follow [`gorilla/prompt.md`](/Users/leemoore/code/lspec-core/gorilla/prompt.md) and write evidence into `gorilla/evidence/<YYYY-MM-DD>/`.
4. Keep the canonical filename format: `<provider>-<scenario>.md`
5. For a clean report, record `- Unexpected behaviors observed: none` in the `## Divergences` section.
6. If the gorilla run finds issues, fix them before tagging instead of committing unresolved release evidence.
7. Commit the fresh evidence directory before creating the release tag.

The publish workflow accepts evidence directories dated within the last 7 days by default. Use the workflow-dispatch `release_window_days` input only when you intentionally need a wider pre-tag window.

## First publish rehearsal

Do one rehearsal before the first live publish for a version:

1. Update `package.json`, `CHANGELOG.md`, and `VERSION` to the target version.
2. Run `npm run green-verify`.
3. Run `npm run verify-all`.
4. Run `npm run pack-and-install-smoke`.
5. Create the release tag locally in `v<version>` format, but do not push it yet.
6. Start the `Publish` workflow manually from the release branch with `workflow_dispatch`, set `tag` to `v<version>`, and leave `dry_run` enabled.
7. Confirm the workflow reaches the `npm publish --dry-run` step only after the default CI, real-harness, gorilla evidence, and version-sync checks are green.

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

1. In a fresh temp directory, run `npx @lspec/core inspect --spec-pack-root ./fixture --json` against a minimal fixture pack.
2. Confirm the command returns an `inspect` envelope with `status: ok` and `outcome: ready`.
3. Confirm the persisted artifact path named in the envelope exists on disk.
4. Run `npm view @lspec/core version` and confirm the registry version matches the pushed tag.
5. Record the first successful `npx` smoke result in the release notes or maintainer log for TC-6.7a traceability.
