import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "vitest";

test("TC-1.4b: built CLI runs under Node", { timeout: 120_000 }, async () => {
	const root = resolve(import.meta.dirname, "..");
	const cliPath = resolve(root, "dist/bin/lbuild-impl.js");

	await new Promise<void>((resolveBuild, reject) => {
		const build = spawn("npm", ["run", "build"], {
			cwd: root,
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

	const result = await new Promise<{
		code: number | null;
		stdout: string;
		stderr: string;
	}>((resolveResult, reject) => {
		const child = spawn(process.execPath, [cliPath, "--help"], {
			cwd: root,
			env: {
				...process.env,
				FORCE_COLOR: "0",
			},
		});

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
			resolveResult({ code, stdout, stderr });
		});
	});

	expect(result.code).toBe(0);
	expect(result.stderr).toBe("");
	expect(result.stdout).toContain("inspect");
	expect(result.stdout).toContain("story-implement");
});
