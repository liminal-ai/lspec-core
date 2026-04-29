import { expect, test } from "vitest";

import { createSpecPack, parseJsonOutput, runSourceCli } from "../test-helpers";

test("TC-3.4a: stdout JSON contains the full envelope contract", async () => {
	const specPackRoot = await createSpecPack("command-envelope-shape");
	const run = await runSourceCli([
		"inspect",
		"--spec-pack-root",
		specPackRoot,
		"--json",
	]);

	expect(run.exitCode).toBe(0);

	const envelope = parseJsonOutput<Record<string, unknown>>(run.stdout);
	expect(envelope).toEqual(
		expect.objectContaining({
			command: "inspect",
			version: 1,
			status: "ok",
			outcome: "ready",
			errors: expect.any(Array),
			warnings: expect.any(Array),
			artifacts: expect.any(Array),
			startedAt: expect.any(String),
			finishedAt: expect.any(String),
		}),
	);
	expect(envelope.result).toBeTruthy();
});

test("TC-3.4b: persisted artifact matches stdout for the same run", async () => {
	const specPackRoot = await createSpecPack("command-envelope-artifact");
	const run = await runSourceCli([
		"inspect",
		"--spec-pack-root",
		specPackRoot,
		"--json",
	]);

	expect(run.exitCode).toBe(0);

	const envelope = parseJsonOutput(run.stdout);
	const artifactPath = envelope.artifacts[0].path as string;
	const persisted = JSON.parse(await Bun.file(artifactPath).text());

	expect(persisted).toEqual(envelope);
});
