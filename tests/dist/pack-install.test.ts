import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { beforeAll, expect, test } from "vitest";

import {
	ROOT,
	buildPackage,
	createSandboxProject,
	installTarball,
	packPackage,
	run,
} from "./helpers";

beforeAll(async () => {
	await buildPackage();
});

test("TC-6.2a: pack and install round trip", async () => {
	const packed = await packPackage();
	const sandbox = await createSandboxProject("lspec-dist-pack-install");

	try {
		await installTarball(sandbox.root, packed.path);

		const { stdout: cliStdout } = await run(
			"npm",
			[
				"exec",
				"--",
				"lbuild-impl",
				"inspect",
				"--spec-pack-root",
				"./fixture",
				"--json",
			],
			{ cwd: sandbox.root },
		);
		const cliEnvelope = JSON.parse(cliStdout) as {
			command?: string;
			status?: string;
			outcome?: string;
		};
		expect(cliEnvelope).toMatchObject({
			command: "inspect",
			status: "ok",
			outcome: "ready",
		});

		const scriptPath = join(sandbox.root, "verify-sdk.mjs");
		await writeFile(
			scriptPath,
			[
				`import { inspect } from "lbuild-impl/sdk";`,
				`const result = await inspect({ specPackRoot: "./fixture" });`,
				`if (result.command !== "inspect" || result.status !== "ok" || result.outcome !== "ready") {`,
				`  throw new Error(JSON.stringify(result));`,
				`}`,
			].join("\n"),
		);

		const { stderr: sdkStderr } = await run(process.execPath, [scriptPath], {
			cwd: sandbox.root,
		});
		expect(sdkStderr).toBe("");
	} finally {
		await sandbox.cleanup();
		await packed.cleanup();
	}
});

test("TC-6.2b: tarball respects files allowlist", async () => {
	const packed = await packPackage();

	try {
		const allowlistRoots = new Set(["package.json", "LICENSE", "README.md"]);
		const containsDisallowedFile = packed.files.some((path) => {
			if (allowlistRoots.has(path)) {
				return false;
			}
			if (path === "CHANGELOG.md") {
				return false;
			}
			return !path.startsWith("dist/");
		});

		expect(containsDisallowedFile).toBe(false);
		expect(
			packed.files.some((path) =>
				["docs/", "gorilla/", "scripts/", "src/", "tests/"].some((prefix) =>
					path.startsWith(prefix),
				),
			),
		).toBe(false);

		const packageJson = JSON.parse(
			await readFile(join(ROOT, "package.json"), "utf8"),
		) as { files?: string[] };
		expect(packageJson.files).toEqual([
			"dist",
			"README.md",
			"LICENSE",
			"CHANGELOG.md",
		]);
	} finally {
		await packed.cleanup();
	}
});
