import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { beforeAll, expect, test } from "vitest";

import {
	ROOT,
	TYPESCRIPT_CLI,
	buildPackage,
	createSandboxProject,
	installTarball,
	packPackage,
	run,
} from "./helpers";

beforeAll(async () => {
	await buildPackage();
});

test("TC-6.3a: types resolve under TypeScript", async () => {
	const packed = await packPackage();
	const sandbox = await createSandboxProject("lspec-dist-types");

	try {
		await installTarball(sandbox.root, packed.path);
		await writeFile(
			join(sandbox.root, "consumer.ts"),
			[
				`import { inspect } from "lbuild-impl/sdk";`,
				`import type {`,
				`  CliResultEnvelope,`,
				`  ContinuationHandle,`,
				`  InspectInput,`,
				`  InspectResult,`,
				`} from "lbuild-impl/sdk";`,
				``,
				`const input: InspectInput = { specPackRoot: "./fixture" };`,
				`const invoke: (value: InspectInput) => Promise<InspectResult> = inspect;`,
				`declare const continuation: ContinuationHandle;`,
				`const envelope: CliResultEnvelope<{ continuation?: ContinuationHandle }> = {`,
				`  command: "inspect",`,
				`  version: 1,`,
				`  status: "ok",`,
				`  outcome: "ready",`,
				`  result: { continuation },`,
				`  errors: [],`,
				`  warnings: [],`,
				`  artifacts: [],`,
				`  startedAt: "2026-01-01T00:00:00.000Z",`,
				`  finishedAt: "2026-01-01T00:00:00.000Z",`,
				`};`,
				`void input;`,
				`void invoke;`,
				`void envelope;`,
			].join("\n"),
		);
		await writeFile(
			join(sandbox.root, "tsconfig.json"),
			JSON.stringify(
				{
					compilerOptions: {
						module: "NodeNext",
						moduleResolution: "NodeNext",
						target: "ES2022",
						strict: true,
						noEmit: true,
						typeRoots: [`${join(ROOT, "node_modules", "@types")}`],
						types: ["node"],
					},
					include: ["consumer.ts"],
				},
				null,
				2,
			),
		);

		const { stderr } = await run(process.execPath, [TYPESCRIPT_CLI, "-p", "."], {
			cwd: sandbox.root,
		});
		expect(stderr).toBe("");
	} finally {
		await sandbox.cleanup();
		await packed.cleanup();
	}
});
