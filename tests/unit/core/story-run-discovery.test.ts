import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { discoverStoryRunState } from "../../../src/core/story-run-discovery";
import { InvalidSpecPackError } from "../../../src/sdk/errors";
import {
	createStoryOrchestrateSpecPack,
	seedPrimitiveArtifact,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";
import { createSpecPack } from "../../support/test-helpers";

describe("story-run discovery", () => {
	test("TC-2.2a accepts a valid story id and classifies it as ready to start", async () => {
		const specPackRoot = await createSpecPack("story-run-discovery-valid");

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId: "00-foundation",
		});

		expect(selection).toEqual({
			case: "start-new",
		});
	});

	test("TC-2.2b returns invalid-story-id without creating story-lead state", async () => {
		const specPackRoot = await createSpecPack("story-run-discovery-invalid");
		const artifactsRoot = join(specPackRoot, "artifacts");

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId: "99-does-not-exist",
		});

		expect(selection).toEqual({
			case: "invalid-story-id",
			storyId: "99-does-not-exist",
		});
		expect(await Bun.file(artifactsRoot).exists()).toBe(false);
	});

	test("surfaces invalid spec-pack structure before attempting story-id validation", async () => {
		const specPackRoot = await createSpecPack("story-run-discovery-missing", {
			includeStoriesDir: false,
		});

		await expect(
			discoverStoryRunState({
				specPackRoot,
				storyId: "00-foundation",
			}),
		).rejects.toBeInstanceOf(InvalidSpecPackError);
	});

	test("TC-2.3b returns start-from-primitive-artifacts when only sibling story artifacts exist", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-primitives",
		);
		await seedPrimitiveArtifact({
			specPackRoot,
			storyId,
			fileName: "001-implementor.json",
		});
		await seedPrimitiveArtifact({
			specPackRoot,
			storyId,
			fileName: "002-verifier.json",
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
		});

		expect(selection).toEqual({
			case: "start-from-primitive-artifacts",
			sourceArtifactPaths: [
				join(specPackRoot, "artifacts", storyId, "001-implementor.json"),
				join(specPackRoot, "artifacts", storyId, "002-verifier.json"),
			],
		});
	});

	test("TC-2.3c returns the accepted attempt when one accepted story-run exists", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-accepted",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "accepted",
			finalPackageOutcome: "accepted",
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
		});

		expect(selection).toEqual({
			case: "existing-accepted-attempt",
			storyRunId: attempt.storyRunId,
			finalPackagePath: join(
				specPackRoot,
				"artifacts",
				storyId,
				"story-lead",
				`${attempt.attemptKey}-final-package.json`,
			),
		});
	});

	test("TC-2.3d returns resume-required when one interrupted story-run exists", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-interrupted",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
		});

		expect(selection).toEqual({
			case: "resume-required",
			storyRunId: attempt.storyRunId,
			currentSnapshotPath: join(
				specPackRoot,
				"artifacts",
				storyId,
				"story-lead",
				`${attempt.attemptKey}-current.json`,
			),
		});
	});

	test("treats an accepted snapshot without a final package as resumable instead of ambiguous", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-accepted-missing-package",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "accepted",
			finalPackage: null,
			latestArtifacts: [
				{
					kind: "final-package",
					path: join(
						specPackRoot,
						"artifacts",
						storyId,
						"story-lead",
						"001-final-package.json",
					),
				},
			],
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
		});

		expect(selection).toEqual({
			case: "resume-required",
			storyRunId: attempt.storyRunId,
			currentSnapshotPath: join(
				specPackRoot,
				"artifacts",
				storyId,
				"story-lead",
				`${attempt.attemptKey}-current.json`,
			),
		});
	});

	test("TC-2.3e reports candidates in updatedAt order when multiple plausible attempts exist", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-ambiguous",
		);
		const older = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			updatedAt: "2026-05-01T00:00:00.000Z",
			finalPackageOutcome: "interrupted",
		});
		const newer = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "running",
			updatedAt: "2026-05-01T01:00:00.000Z",
			finalPackage: null,
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
		});

		expect(selection).toEqual({
			case: "ambiguous-story-run",
			candidates: [
				expect.objectContaining({
					storyRunId: newer.storyRunId,
					status: "running",
				}),
				expect.objectContaining({
					storyRunId: older.storyRunId,
					status: "interrupted",
				}),
			],
		});
	});

	test("TC-2.10a can target a specific attempt by storyRunId when recovering status", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-explicit",
		);
		const interrupted = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "running",
			finalPackage: null,
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
			storyRunId: interrupted.storyRunId,
		});

		expect(selection).toEqual({
			case: "resume-required",
			storyRunId: interrupted.storyRunId,
			currentSnapshotPath: join(
				specPackRoot,
				"artifacts",
				storyId,
				"story-lead",
				`${interrupted.attemptKey}-current.json`,
			),
		});
	});

	test("returns invalid-story-run-id instead of falling back to another attempt when an explicit storyRunId is unknown", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-run-discovery-invalid-explicit-run-id",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});

		expect(selection).toEqual({
			case: "invalid-story-run-id",
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});
	});
});
