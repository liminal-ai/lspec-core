import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
	createRunConfig,
	createSpecPack,
	createTempDir,
	parseJsonOutput,
	runSourceCli,
	writeFakeProviderExecutable,
	writeRunConfig,
	writeTextFile,
} from "../../support/test-helpers";

async function runLongJsonPrimitive(extraArgs: string[] = []) {
	const specPackRoot = await createSpecPack("package-primitive-json-output", {
		companionMode: "four-file",
	});
	await writeTextFile(
		join(specPackRoot, "package.json"),
		`${JSON.stringify(
			{
				name: "fixture-spec-pack",
				private: true,
				scripts: {
					"green-verify": "npm run test",
					"verify-all": "npm run test",
				},
			},
			null,
			2,
		)}\n`,
	);
	await writeRunConfig(
		specPackRoot,
		createRunConfig({
			caller_harness: {
				harness: "codex",
				primitive_heartbeat_cadence_minutes: 5,
			},
		}),
	);
	const providerBinDir = await createTempDir("package-primitive-json-provider");
	const { env } = await writeFakeProviderExecutable({
		binDir: providerBinDir,
		provider: "codex",
		responses: [
			{
				delayMs: 90,
				stdout: "Applied the bounded quick fix.",
			},
		],
	});

	return await runSourceCli(
		[
			"quick-fix",
			"--spec-pack-root",
			specPackRoot,
			"--request-text",
			"Apply the bounded quick fix.",
			"--json",
			...extraArgs,
		],
		{
			env: {
				PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
				LBUILD_IMPL_HEARTBEAT_INTERVAL_MS: "25",
				...env,
			},
		},
	);
}

describe("primitive JSON output with heartbeats", () => {
	test("TC-1.2a keeps stdout as the exact final JSON envelope and writes heartbeats to stderr", async () => {
		const run = await runLongJsonPrimitive();

		expect(run.exitCode).toBe(0);
		expect(run.stderr).toContain("[heartbeat] quick-fix");
		expect(run.stdout).not.toContain("[heartbeat]");
		expect(run.stdout.trim().split("\n")).toHaveLength(1);
		expect(parseJsonOutput(run.stdout)).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				outcome: "ready-for-verification",
			}),
		);
	});

	test("TC-1.2b allows stdout to be parsed as a single JSON object without heartbeat filtering", async () => {
		const run = await runLongJsonPrimitive();
		const parsed = JSON.parse(run.stdout);

		expect(parsed).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				status: "ok",
				result: expect.objectContaining({
					rawProviderOutputPreview: "Applied the bounded quick fix.",
				}),
			}),
		);
	});

	test("keeps JSON stdout exact when heartbeat output is disabled with --no-heartbeat", async () => {
		const run = await runLongJsonPrimitive(["--no-heartbeat"]);

		expect(run.exitCode).toBe(0);
		expect(run.stderr).not.toContain("[heartbeat]");
		expect(run.stdout.trim().split("\n")).toHaveLength(1);
		expect(JSON.parse(run.stdout)).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				outcome: "ready-for-verification",
			}),
		);
	});

	test("keeps JSON stdout exact when a caller harness override changes heartbeat wording", async () => {
		const run = await runLongJsonPrimitive(["--caller-harness", "claude-code"]);

		expect(run.exitCode).toBe(0);
		expect(run.stderr).toContain("Monitor");
		expect(run.stdout).not.toContain("Monitor");
		expect(JSON.parse(run.stdout)).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				status: "ok",
			}),
		);
	});
});
