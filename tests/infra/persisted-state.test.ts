import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import {
	buildRuntimeProgressPaths,
	buildStreamOutputPaths,
} from "../../src/core/artifact-writer";
import { RuntimeProgressTracker } from "../../src/core/runtime-progress";
import {
	createRunConfig,
	createTempDir,
	writeRunConfig,
} from "../test-helpers";

test("TC-4.1b: persisted state files carry root-level version markers", async () => {
	const specPackRoot = await createTempDir("persisted-state-version");
	await writeRunConfig(specPackRoot, createRunConfig());

	const artifactPath = join(
		specPackRoot,
		"artifacts",
		"story-03",
		"001-implementor.json",
	);
	const tracker = await RuntimeProgressTracker.start({
		command: "story-implement",
		phase: "initial-implement",
		provider: "codex",
		cwd: specPackRoot,
		timeoutMs: 1_000,
		artifactPath,
		streamPaths: buildStreamOutputPaths(artifactPath),
		progressPaths: buildRuntimeProgressPaths(artifactPath),
	});
	await tracker.markCompleted("story-implement completed.");
	await tracker.flush();

	const config = JSON.parse(
		await readFile(join(specPackRoot, "impl-run.config.json"), "utf8"),
	) as { version?: number };
	const status = JSON.parse(
		await readFile(buildRuntimeProgressPaths(artifactPath).statusPath, "utf8"),
	) as { version?: number };

	expect(config.version).toBe(1);
	expect(status.version).toBe(1);
});
