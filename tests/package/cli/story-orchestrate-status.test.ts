import { describe, expect, test } from "vitest";

import { parseJsonOutput, runSourceCli } from "../../support/test-helpers";
import {
	createStoryOrchestrateSpecPack,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";

describe("story-orchestrate status CLI", () => {
	test("TC-2.5a selects a single attempt by story id when story run id is omitted", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-status-single",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const run = await runSourceCli([
			"story-orchestrate",
			"status",
			"--spec-pack-root",
			specPackRoot,
			"--story-id",
			storyId,
			"--json",
		]);
		const envelope = parseJsonOutput<{
			result: {
				case: string;
				storyRunId: string;
				currentStatus: string;
				latestEventSequence: number;
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(0);
		expect(envelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: attempt.storyRunId,
				currentStatus: "interrupted",
				latestEventSequence: 1,
			}),
		);
	});

	test("TC-2.5b reports ambiguous attempts instead of guessing", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-status-ambiguous",
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

		const run = await runSourceCli([
			"story-orchestrate",
			"status",
			"--spec-pack-root",
			specPackRoot,
			"--story-id",
			storyId,
			"--json",
		]);
		const envelope = parseJsonOutput<{
			result: {
				case: string;
				candidates: Array<{ storyRunId: string; status: string }>;
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(2);
		expect(envelope.result.case).toBe("ambiguous-story-run");
		expect(envelope.result.candidates).toEqual([
			expect.objectContaining({
				storyRunId: newer.storyRunId,
				status: "running",
			}),
			expect.objectContaining({
				storyRunId: older.storyRunId,
				status: "interrupted",
			}),
		]);
	});

	test("TC-2.5c reports an accepted attempt and its final package by story id", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-status-accepted",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "accepted",
			finalPackageOutcome: "accepted",
		});

		const run = await runSourceCli([
			"story-orchestrate",
			"status",
			"--spec-pack-root",
			specPackRoot,
			"--story-id",
			storyId,
			"--json",
		]);
		const envelope = parseJsonOutput<{
			result: {
				case: string;
				storyRunId: string;
				currentStatus: string;
				finalPackagePath?: string;
				finalPackage?: { outcome: string };
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(0);
		expect(envelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: attempt.storyRunId,
				currentStatus: "accepted",
				finalPackagePath: attempt.finalPackagePath,
				finalPackage: expect.objectContaining({
					outcome: "accepted",
				}),
			}),
		);
	});

	test("returns invalid-story-run-id when status is asked for an explicit unknown attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-status-invalid-run-id",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "accepted",
			finalPackageOutcome: "accepted",
		});

		const run = await runSourceCli([
			"story-orchestrate",
			"status",
			"--spec-pack-root",
			specPackRoot,
			"--story-id",
			storyId,
			"--story-run-id",
			"00-foundation-story-run-999",
			"--json",
		]);
		const envelope = parseJsonOutput<{
			outcome: string;
			result: {
				case: string;
				storyId: string;
				storyRunId: string;
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(1);
		expect(envelope.outcome).toBe("invalid-story-run-id");
		expect(envelope.result).toEqual({
			case: "invalid-story-run-id",
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});
	});
});
