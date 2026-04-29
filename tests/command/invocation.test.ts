import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "vitest";

import { createSpecPack } from "../test-helpers";

const ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(ROOT, "dist/bin/lbuild-impl.js");

test("TC-3.5a: built CLI runs through node", async () => {
	const specPackRoot = await createSpecPack("node-cli-invocation");

	await new Promise<void>((resolveBuild, reject) => {
		const build = spawn("npm", ["run", "build"], {
			cwd: ROOT,
			env: {
				...process.env,
				FORCE_COLOR: "0",
			},
		});
		build.on("error", reject);
		build.on("close", (code) => {
			if (code === 0) {
				resolveBuild();
				return;
			}

			reject(new Error(`npm run build exited with code ${code}`));
		});
	});

	const run = await new Promise<{
		code: number | null;
		stdout: string;
		stderr: string;
	}>((resolveRun, reject) => {
		const child = spawn(
			process.execPath,
			[CLI_PATH, "inspect", "--spec-pack-root", specPackRoot, "--json"],
			{
				cwd: ROOT,
				env: {
					...process.env,
					FORCE_COLOR: "0",
				},
			},
		);
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("close", (code) => {
			resolveRun({ code, stdout, stderr });
		});
	});

	expect(run.code).toBe(0);
	expect(run.stderr).toBe("");
	expect(JSON.parse(run.stdout)).toEqual(
		expect.objectContaining({
			command: "inspect",
			status: "ok",
			outcome: "ready",
		}),
	);
});
