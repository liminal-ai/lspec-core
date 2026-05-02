import { describe, expect, test } from "vitest";

import {
	storyOrchestrateResume,
	storyOrchestrateStatus,
} from "../../../src/sdk/operations/story-orchestrate";
import { readJsonLines } from "../../support/test-helpers";
import {
	createStoryOrchestrateSpecPack,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";

describe("story-orchestrate resume sdk operation", () => {
	test("preserves prior artifact history and appends monotonic events when resuming an existing attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-resume-sequencing",
		);
		const checkpointArtifact = `${specPackRoot}/artifacts/${storyId}/001-implementor.json`;
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
			latestEventSequence: 3,
			latestArtifacts: [
				{
					kind: "implementor-result",
					path: checkpointArtifact,
				},
			],
		});

		const resumeEnvelope = await storyOrchestrateResume({
			specPackRoot,
			storyId,
			storyRunId: attempt.storyRunId,
		});
		const statusEnvelope = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: attempt.storyRunId,
		});
		const events = await readJsonLines<Array<{ sequence: number }>[number]>(
			attempt.eventHistoryPath,
		);

		expect(resumeEnvelope.outcome).toBe("interrupted");
		expect(resumeEnvelope.result).toEqual(
			expect.objectContaining({
				case: "completed",
				storyRunId: attempt.storyRunId,
			}),
		);
		expect(events.map((event) => event.sequence)).toEqual([3, 4, 5]);
		expect(statusEnvelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: attempt.storyRunId,
				latestEventSequence: 5,
				currentSnapshot: expect.objectContaining({
					latestArtifacts: expect.arrayContaining([
						expect.objectContaining({
							path: checkpointArtifact,
						}),
					]),
				}),
			}),
		);
	});

	test("returns invalid-story-run-id when resume is asked to reopen an unknown explicit attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-resume-invalid-run-id",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const envelope = await storyOrchestrateResume({
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
