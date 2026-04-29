import { readFile, writeFile } from "node:fs/promises";
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

test("TypeScript consumers can import each public SDK subpath", async () => {
	const packed = await packPackage();
	const sandbox = await createSandboxProject("lspec-dist-subpaths-ts");

	try {
		await installTarball(sandbox.root, packed.path);
		await writeFile(
			join(sandbox.root, "consumer.ts"),
			[
				`import { inspect } from "lbuild-impl/sdk";`,
				`import { cliResultEnvelopeSchema, inspectResultSchema } from "lbuild-impl/sdk/contracts";`,
				`import { InvalidInputError } from "lbuild-impl/sdk/errors";`,
				`import type { CliResultEnvelope } from "lbuild-impl/sdk/contracts";`,
				``,
				`const runtimeValue = cliResultEnvelopeSchema(inspectResultSchema);`,
				`const errorConstructor = InvalidInputError;`,
				`const invoke = inspect;`,
				`const sample: CliResultEnvelope<{ ok: true }> = {`,
				`  command: "inspect",`,
				`  version: 1,`,
				`  status: "ok",`,
				`  outcome: "ready",`,
				`  result: { ok: true },`,
				`  errors: [],`,
				`  warnings: [],`,
				`  artifacts: [],`,
				`  startedAt: "2026-01-01T00:00:00.000Z",`,
				`  finishedAt: "2026-01-01T00:00:00.000Z",`,
				`};`,
				`void runtimeValue;`,
				`void errorConstructor;`,
				`void invoke;`,
				`void sample;`,
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

test("JavaScript consumers can import each public SDK subpath", async () => {
	const packed = await packPackage();
	const sandbox = await createSandboxProject("lspec-dist-subpaths-js");

	try {
		await installTarball(sandbox.root, packed.path);
		const scriptPath = join(sandbox.root, "consumer.mjs");
		await writeFile(
			scriptPath,
			[
				`import { inspect } from "lbuild-impl/sdk";`,
				`import { cliResultEnvelopeSchema, inspectResultSchema } from "lbuild-impl/sdk/contracts";`,
				`import { InvalidInputError } from "lbuild-impl/sdk/errors";`,
				`if (typeof inspect !== "function") throw new Error("inspect export missing");`,
				`if (typeof cliResultEnvelopeSchema !== "function") throw new Error("contracts export missing");`,
				`if (typeof cliResultEnvelopeSchema(inspectResultSchema).parse !== "function") throw new Error("contracts schema factory broken");`,
				`if (!(new InvalidInputError("boom") instanceof Error)) throw new Error("errors export missing");`,
				`console.log("ok");`,
			].join("\n"),
		);

		const { stdout, stderr } = await run(process.execPath, [scriptPath], {
			cwd: sandbox.root,
		});
		expect(stdout.trim()).toBe("ok");
		expect(stderr).toBe("");
	} finally {
		await sandbox.cleanup();
		await packed.cleanup();
	}
});

test("types-only imports erase without runtime cost", async () => {
	const packed = await packPackage();
	const sandbox = await createSandboxProject("lspec-dist-subpaths-type-only");

	try {
		await installTarball(sandbox.root, packed.path);
		await writeFile(
			join(sandbox.root, "type-only.ts"),
			[
				`import type { CliResultEnvelope } from "lbuild-impl/sdk/contracts";`,
				`import type { InvalidInputError } from "lbuild-impl/sdk/errors";`,
				`export type Envelope = CliResultEnvelope<{ ok: true }>;`,
				`export type ErrorShape = InvalidInputError;`,
				`export const outcome: Envelope["outcome"] = "ready";`,
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
						outDir: "./out",
						strict: true,
						typeRoots: [`${join(ROOT, "node_modules", "@types")}`],
						types: ["node"],
					},
					include: ["type-only.ts"],
				},
				null,
				2,
			),
		);

		const { stderr } = await run(process.execPath, [TYPESCRIPT_CLI, "-p", "."], {
			cwd: sandbox.root,
		});
		expect(stderr).toBe("");

		const emitted = await readFile(join(sandbox.root, "out", "type-only.js"), "utf8");
		expect(emitted).not.toContain("lbuild-impl");
	} finally {
		await sandbox.cleanup();
		await packed.cleanup();
	}
});
