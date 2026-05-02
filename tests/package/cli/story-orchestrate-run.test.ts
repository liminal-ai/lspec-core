import { describe, expect, test } from "vitest";

import {
	createSpecPack,
	parseJsonOutput,
	runSourceCli,
} from "../../support/test-helpers";

describe("story-orchestrate run CLI", () => {
	test("TC-2.7a and TC-2.7b emits story-level heartbeats with the 10-minute default cadence", async () => {
		const specPackRoot = await createSpecPack(
			"story-orchestrate-run-heartbeat",
		);

		const run = await runSourceCli(
			[
				"story-orchestrate",
				"run",
				"--spec-pack-root",
				specPackRoot,
				"--story-id",
				"00-foundation",
				"--json",
			],
			{
				env: {
					LBUILD_IMPL_HEARTBEAT_INTERVAL_MS: "20",
					LBUILD_IMPL_STORY_ORCHESTRATE_DELAY_MS: "80",
				},
			},
		);
		const envelope = parseJsonOutput<{
			result: {
				storyId: string;
				storyRunId: string;
				currentSnapshotPath: string;
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(2);
		expect(run.stderr).toContain("[heartbeat] story-orchestrate run");
		expect(run.stderr).toContain("Story id: 00-foundation.");
		expect(run.stderr).toContain(`Story run: ${envelope.result.storyRunId}.`);
		expect(run.stderr).toContain("Phase: story-orchestrate-run.");
		expect(run.stderr).toContain(
			`Current snapshot: ${envelope.result.currentSnapshotPath}.`,
		);
		expect(run.stderr).toContain("after 10 minute(s)");
	});

	test("TC-2.8a emits a terminal marker with outcome, story run id, and final package", async () => {
		const specPackRoot = await createSpecPack("story-orchestrate-run-terminal");

		const run = await runSourceCli([
			"story-orchestrate",
			"run",
			"--spec-pack-root",
			specPackRoot,
			"--story-id",
			"00-foundation",
			"--json",
		]);
		const envelope = parseJsonOutput<{
			result: {
				outcome: string;
				storyRunId: string;
				finalPackagePath: string;
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(2);
		expect(run.stderr).toContain("[terminal] story-orchestrate run");
		expect(run.stderr).toContain(
			`outcome ${envelope.result.outcome}. storyRunId=${envelope.result.storyRunId}.`,
		);
		expect(run.stderr).toContain(
			`Final package: ${envelope.result.finalPackagePath}`,
		);
	});

	test("TC-2.8b records incomplete runs without a terminal final package", async () => {
		const specPackRoot = await createSpecPack(
			"story-orchestrate-run-incomplete",
		);

		const run = await runSourceCli(
			[
				"story-orchestrate",
				"run",
				"--spec-pack-root",
				specPackRoot,
				"--story-id",
				"00-foundation",
				"--json",
			],
			{
				env: {
					LBUILD_IMPL_STORY_ORCHESTRATE_INCOMPLETE: "1",
				},
			},
		);
		const envelope = parseJsonOutput<{
			result: {
				case: string;
				storyRunId: string;
				currentSnapshotPath: string;
				finalPackagePath?: string;
			};
		}>(run.stdout);

		expect(run.exitCode).toBe(2);
		expect(envelope.result.case).toBe("interrupted");
		expect(envelope.result.finalPackagePath).toBeUndefined();
		expect(run.stderr).toContain("Incomplete run recorded");

		const status = await runSourceCli([
			"story-orchestrate",
			"status",
			"--spec-pack-root",
			specPackRoot,
			"--story-id",
			"00-foundation",
			"--json",
		]);
		const statusEnvelope = parseJsonOutput<{
			result: {
				case: string;
				storyRunId: string;
				currentStatus: string;
				currentSnapshotPath: string;
				finalPackagePath?: string;
			};
		}>(status.stdout);

		expect(statusEnvelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: envelope.result.storyRunId,
				currentStatus: "interrupted",
				currentSnapshotPath: envelope.result.currentSnapshotPath,
			}),
		);
		expect(statusEnvelope.result.finalPackagePath).toBeUndefined();
	});
});
