import { describe, expect, test } from "vitest";

import { runSourceCli } from "../../support/test-helpers";

describe("story-orchestrate help", () => {
	test("TC-2.1a exposes run help that describes orienting from existing story artifacts", async () => {
		const run = await runSourceCli(["story-orchestrate", "run", "--help"]);

		expect(run.exitCode).toBe(0);
		expect(run.stdout).toContain(
			"Run a story-lead for one story after orienting from existing story artifacts.",
		);
	});

	test("TC-2.1b exposes resume help that describes resuming or reopening an attempt", async () => {
		const run = await runSourceCli(["story-orchestrate", "resume", "--help"]);

		expect(run.exitCode).toBe(0);
		expect(run.stdout).toContain(
			"Resume or reopen a durable story-lead attempt for one story.",
		);
	});

	test("TC-2.1c exposes status help that describes reading durable story-lead status", async () => {
		const run = await runSourceCli(["story-orchestrate", "status", "--help"]);

		expect(run.exitCode).toBe(0);
		expect(run.stdout).toContain(
			"Read durable story-lead status by story id or story run id.",
		);
	});
});
