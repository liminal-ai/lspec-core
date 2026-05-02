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

async function createQuickFixSpecPack(scope: string): Promise<string> {
	const specPackRoot = await createSpecPack(scope, {
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
	return specPackRoot;
}

async function runQuickFix(input: {
	scope: string;
	delayMs: number;
	heartbeatIntervalMs?: number;
	args?: string[];
	json?: boolean;
}) {
	const specPackRoot = await createQuickFixSpecPack(input.scope);
	const providerBinDir = await createTempDir(`${input.scope}-provider`);
	const { env } = await writeFakeProviderExecutable({
		binDir: providerBinDir,
		provider: "codex",
		responses: [
			{
				delayMs: input.delayMs,
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
			...(input.json ? ["--json"] : []),
			...(input.args ?? []),
		],
		{
			env: {
				PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
				...(typeof input.heartbeatIntervalMs === "number"
					? {
							LBUILD_IMPL_HEARTBEAT_INTERVAL_MS: String(
								input.heartbeatIntervalMs,
							),
						}
					: {}),
				...env,
			},
		},
	);
}

describe("primitive command heartbeats", () => {
	test("TC-1.1a emits a heartbeat after the cadence window while the primitive command is active", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-long-run",
			delayMs: 90,
			heartbeatIntervalMs: 25,
			json: true,
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).toContain("[heartbeat] quick-fix");
		expect(run.stderr).toContain("Status artifact:");
		expect(run.stderr).toContain("same running exec session");
	});

	test("TC-1.1b does not emit a heartbeat for a short primitive command", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-short-run",
			delayMs: 0,
			heartbeatIntervalMs: 10_000,
			json: true,
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).not.toContain("[heartbeat]");
		expect(parseJsonOutput(run.stdout)).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				outcome: "ready-for-verification",
			}),
		);
	});

	test("TC-1.3a emits heartbeat text on stderr in non-JSON mode without changing stdout summary", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-human-mode",
			delayMs: 90,
			heartbeatIntervalMs: 25,
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).toContain("[heartbeat] quick-fix");
		expect(run.stdout).toContain("quick-fix: ready-for-verification");
		expect(run.stdout).not.toContain("[heartbeat]");
	});

	test("TC-1.7a suppresses heartbeat output when --disable-heartbeats is supplied", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-disabled",
			delayMs: 90,
			heartbeatIntervalMs: 25,
			json: true,
			args: ["--disable-heartbeats"],
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).not.toContain("[heartbeat]");
		expect(parseJsonOutput(run.stdout)).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				outcome: "ready-for-verification",
			}),
		);
	});

	test("suppresses heartbeat output when --no-heartbeat is supplied", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-no-heartbeat",
			delayMs: 90,
			heartbeatIntervalMs: 25,
			json: true,
			args: ["--no-heartbeat"],
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).not.toContain("[heartbeat]");
		expect(parseJsonOutput(run.stdout)).toEqual(
			expect.objectContaining({
				command: "quick-fix",
				outcome: "ready-for-verification",
			}),
		);
	});

	test("uses caller-harness-specific Claude Code Monitor guidance", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-claude-guidance",
			delayMs: 90,
			heartbeatIntervalMs: 25,
			json: true,
			args: ["--caller-harness", "claude-code"],
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).toContain("[heartbeat] quick-fix");
		expect(run.stderr).toContain("Monitor");
		expect(run.stderr).toContain("attached command until it exits");
	});

	test("accepts a primitive heartbeat cadence override flag", async () => {
		const run = await runQuickFix({
			scope: "primitive-heartbeat-cadence-override",
			delayMs: 90,
			heartbeatIntervalMs: 25,
			json: true,
			args: ["--heartbeat-cadence-minutes", "1"],
		});

		expect(run.exitCode).toBe(0);
		expect(run.stderr).toContain("[heartbeat] quick-fix");
		expect(run.stderr).toContain("after 1 minute");
	});
});
