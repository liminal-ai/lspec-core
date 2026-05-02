import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "../../support/test-helpers";

async function readProjectFile(path: string): Promise<string> {
	return await readFile(join(ROOT, path), "utf8");
}

test("TC-5.1a keeps unit coverage for heartbeat contract behavior", async () => {
	const [primitiveHeartbeats, heartbeatEmitter, heartbeatOptions] =
		await Promise.all([
			readProjectFile("tests/unit/cli/primitive-heartbeats.test.ts"),
			readProjectFile("tests/unit/core/heartbeat-emitter.test.ts"),
			readProjectFile("tests/unit/sdk/heartbeat-options.test.ts"),
		]);

	expect(primitiveHeartbeats).toContain("TC-1.1a");
	expect(primitiveHeartbeats).toContain("TC-1.7a");
	expect(heartbeatEmitter).toContain("TC-1.6a");
	expect(heartbeatEmitter).toContain("TC-2.7a");
	expect(heartbeatOptions).toContain("TC-1.5a");
	expect(heartbeatOptions).toContain("TC-1.5d");
});

test("TC-5.1b keeps unit coverage for story-lead schema and provider-selection contracts", async () => {
	const [contracts, loop, providerSelection] = await Promise.all([
		readProjectFile("tests/unit/core/story-orchestrate-contracts.test.ts"),
		readProjectFile("tests/unit/core/story-lead-loop.test.ts"),
		readProjectFile("tests/unit/core/story-lead-provider-selection.test.ts"),
	]);

	expect(contracts).toContain("story-lead final package");
	expect(loop).toContain("TC-3.9a");
	expect(providerSelection).toContain("TC-2.9a");
	expect(providerSelection).toContain("TC-2.9b");
});

test("TC-5.1c keeps package coverage for primitive heartbeats and story-orchestrate run/resume/status", async () => {
	const [primitiveJson, runCli, resumeCli, statusCli] = await Promise.all([
		readProjectFile("tests/package/cli/primitive-json-output.test.ts"),
		readProjectFile("tests/package/cli/story-orchestrate-run.test.ts"),
		readProjectFile("tests/package/cli/story-orchestrate-resume.test.ts"),
		readProjectFile("tests/package/cli/story-orchestrate-status.test.ts"),
	]);

	expect(primitiveJson).toContain("TC-1.2a");
	expect(runCli).toContain("TC-2.7a");
	expect(resumeCli).toContain("TC-2.6a");
	expect(statusCli).toContain("story-orchestrate status CLI");
});
