import { describe, expect, test } from "vitest";

import { parseJsonOutput, runSourceCli } from "../../support/test-helpers";
import {
	createStoryOrchestrateSpecPack,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";

describe("story-orchestrate resume CLI", () => {
	test("returns invalid-story-run-id instead of selecting another attempt when an explicit storyRunId is unknown", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-resume-invalid-run-id",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const run = await runSourceCli([
			"story-orchestrate",
			"resume",
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
