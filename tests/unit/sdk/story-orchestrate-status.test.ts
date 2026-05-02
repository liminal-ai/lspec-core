import { describe, expect, test } from "vitest";

import { storyOrchestrateStatus } from "../../../src/sdk/operations/story-orchestrate";
import {
	createStoryOrchestrateSpecPack,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";

describe("story-orchestrate status sdk operation", () => {
	test("TC-2.5a returns single-attempt status by story id when one attempt exists", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-status-single",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const envelope = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
		});

		expect(envelope.outcome).toBe("single-attempt");
		expect(envelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: attempt.storyRunId,
				currentStatus: "interrupted",
			}),
		);
	});

	test("TC-2.5b returns ambiguity by story id when multiple plausible attempts exist", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-status-ambiguous",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "running",
			updatedAt: "2026-05-01T02:00:00.000Z",
			finalPackage: null,
		});
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			updatedAt: "2026-05-01T01:00:00.000Z",
			finalPackageOutcome: "interrupted",
		});

		const envelope = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
		});

		expect(envelope.outcome).toBe("ambiguous-story-run");
		expect(envelope.result).toEqual(
			expect.objectContaining({
				case: "ambiguous-story-run",
				candidates: expect.arrayContaining([
					expect.objectContaining({
						status: "running",
					}),
				]),
			}),
		);
	});

	test("TC-2.5c returns the final package for a prior accepted attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-status-accepted",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "accepted",
			finalPackageOutcome: "accepted",
		});

		const envelope = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
		});

		expect(envelope.outcome).toBe("single-attempt");
		expect(envelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				currentStatus: "accepted",
				finalPackage: expect.objectContaining({
					outcome: "accepted",
				}),
			}),
		);
	});

	test("returns invalid-story-run-id when status is asked for an explicit unknown attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-status-invalid-run-id",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const envelope = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});

		expect(envelope.outcome).toBe("invalid-story-run-id");
		expect(envelope.result).toEqual({
			case: "invalid-story-run-id",
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});
	});
});
