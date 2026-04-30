import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { TEAM_IMPL_LOG_FILE_NAME } from "../../../src/core/log-template";
import {
	createRunConfig,
	createSpecPack,
	createTempDir,
	parseJsonOutput,
	runSourceCli,
	writeFakeProviderExecutable,
	writeRunConfig,
} from "../../support/test-helpers";

type TestEnvelope = {
	command: string;
	artifacts: Array<{ path: string }>;
	errors: Array<{ code: string; message: string }>;
} & Record<string, unknown>;

describe("cli io contract", () => {
	test("--json emits exactly one envelope object on stdout", async () => {
		const specPackRoot = await createSpecPack("cli-io-json");
		const run = await runSourceCli([
			"inspect",
			"--spec-pack-root",
			specPackRoot,
			"--json",
		]);

		expect(run.exitCode).toBe(0);
		expect(run.stdout.trim().split("\n")).toHaveLength(1);

		const envelope = parseJsonOutput<TestEnvelope>(run.stdout);
		expect(envelope.command).toBe("inspect");
	});

	test("persisted artifact json matches the stdout envelope", async () => {
		const specPackRoot = await createSpecPack("cli-io-artifact");
		const run = await runSourceCli([
			"inspect",
			"--spec-pack-root",
			specPackRoot,
			"--json",
		]);

		expect(run.exitCode).toBe(0);

		const envelope = parseJsonOutput<TestEnvelope>(run.stdout);
		const artifactPath = envelope.artifacts[0].path as string;
		const persisted = JSON.parse(await Bun.file(artifactPath).text());

		expect(persisted).toEqual(envelope);
	});

	test("--json inspect rejects unknown flags with a pure error envelope", async () => {
		const specPackRoot = await createSpecPack("cli-io-inspect-unknown-flag");
		const run = await runSourceCli([
			"inspect",
			"--spec-pack-root",
			specPackRoot,
			"--bogus",
			"--json",
		]);

		expect(run.exitCode).toBe(1);
		expect(run.stderr).toBe("");
		expect(run.stdout.trim().split("\n")).toHaveLength(1);

		const envelope = parseJsonOutput<TestEnvelope>(run.stdout);
		expect(envelope).toMatchObject({
			command: "inspect",
			status: "error",
			outcome: "error",
			errors: [{ code: "INVALID_INPUT", message: "Unknown option: --bogus" }],
		});
		expect(
			await Bun.file(join(specPackRoot, TEAM_IMPL_LOG_FILE_NAME)).exists(),
		).toBe(false);
		expect(
			JSON.parse(await Bun.file(envelope.artifacts[0].path).text()),
		).toEqual(envelope);
	});

	test("--json provider commands reject unknown flags before provider work starts", async () => {
		const specPackRoot = await createSpecPack("cli-io-quick-fix-unknown-flag", {
			companionMode: "four-file",
		});
		await writeRunConfig(specPackRoot, createRunConfig());
		const providerBinDir = await createTempDir("cli-io-quick-fix-provider");
		const { env, logPath } = await writeFakeProviderExecutable({
			binDir: providerBinDir,
			provider: "codex",
			responses: [{ stdout: '{"outcome":"ready-for-verification"}' }],
		});

		const run = await runSourceCli(
			[
				"quick-fix",
				"--spec-pack-root",
				specPackRoot,
				"--request-text",
				"Make the smallest possible contract fix.",
				"--definitely-unknown",
				"--json",
			],
			{
				env: {
					PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
					...env,
				},
			},
		);

		expect(run.exitCode).toBe(1);
		expect(run.stderr).toBe("");
		expect(run.stdout.trim().split("\n")).toHaveLength(1);

		const envelope = parseJsonOutput<TestEnvelope>(run.stdout);
		expect(envelope).toMatchObject({
			command: "quick-fix",
			status: "error",
			outcome: "error",
			errors: [
				{
					code: "INVALID_INPUT",
					message: "Unknown option: --definitely-unknown",
				},
			],
		});
		expect(await Bun.file(logPath).exists()).toBe(false);
		expect(
			JSON.parse(await Bun.file(envelope.artifacts[0].path).text()),
		).toEqual(envelope);
	});
});
