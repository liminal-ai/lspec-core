import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "..");

async function run(
	file: string,
	args: string[],
	options: {
		cwd: string;
		env?: NodeJS.ProcessEnv;
	} = { cwd: ROOT },
) {
	return await execFileAsync(file, args, {
		cwd: options.cwd,
		env: {
			...process.env,
			FORCE_COLOR: "0",
			...options.env,
		},
	});
}

async function createFixtureSpecPack(baseDir: string): Promise<string> {
	const specPackRoot = join(baseDir, "fixture");
	await mkdir(join(specPackRoot, "stories"), { recursive: true });
	await writeFile(join(specPackRoot, "epic.md"), "# Epic\n");
	await writeFile(join(specPackRoot, "tech-design.md"), "# Technical Design\n");
	await writeFile(join(specPackRoot, "test-plan.md"), "# Test Plan\n");
	await writeFile(
		join(specPackRoot, "stories", "00-foundation.md"),
		"# Story 0: Foundation\n",
	);
	await writeFile(
		join(specPackRoot, "stories", "01-next.md"),
		"# Story 1: Next\n",
	);
	return specPackRoot;
}

async function main() {
	await run("npm", ["run", "build"], { cwd: ROOT });
	const { stdout: packStdout } = await run("npm", ["pack", "--json"], {
		cwd: ROOT,
	});
	const packResult = JSON.parse(packStdout) as Array<{ filename: string }>;
	const tarballName = packResult[0]?.filename;
	if (!tarballName) {
		throw new Error("npm pack did not report a tarball filename.");
	}

	const tarballPath = join(ROOT, tarballName);
	const sandboxRoot = await mkdtemp(join(tmpdir(), "lspec-pack-smoke-"));

	try {
		await run("npm", ["init", "-y"], { cwd: sandboxRoot });
		await run("git", ["init"], { cwd: sandboxRoot });
		await createFixtureSpecPack(sandboxRoot);
		await run("npm", ["install", tarballPath], { cwd: sandboxRoot });
		const { stdout } = await run(
			"npm",
			[
				"exec",
				"--",
				"lspec",
				"inspect",
				"--spec-pack-root",
				"./fixture",
				"--json",
			],
			{ cwd: sandboxRoot },
		);
		const envelope = JSON.parse(stdout) as {
			command?: string;
			status?: string;
			outcome?: string;
		};

		if (
			envelope.command !== "inspect" ||
			envelope.status !== "ok" ||
			envelope.outcome !== "ready"
		) {
			throw new Error("Packed artifact produced an unexpected CLI envelope.");
		}

		const sdkScriptPath = join(sandboxRoot, "verify-sdk.mjs");
		await writeFile(
			sdkScriptPath,
			[
				`import { inspect } from "@lspec/core/sdk";`,
				`const result = await inspect({ specPackRoot: "./fixture" });`,
				`if (result.command !== "inspect" || result.status !== "ok" || result.outcome !== "ready") {`,
				`  throw new Error(JSON.stringify(result));`,
				`}`,
			].join("\n"),
		);
		await run(process.execPath, [sdkScriptPath], { cwd: sandboxRoot });
	} finally {
		await rm(sandboxRoot, { recursive: true, force: true });
		await rm(tarballPath, { force: true });
	}
}

await main();
