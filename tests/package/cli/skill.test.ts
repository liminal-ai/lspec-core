import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");
const CLI_PATH = resolve(ROOT, "dist/bin/lbuild-impl.js");

async function runBuild(): Promise<void> {
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
}

function runCli(args: string[]) {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>(
		(resolveRun, reject) => {
			const child = spawn(process.execPath, [CLI_PATH, ...args], {
				cwd: ROOT,
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
				resolveRun({ code, stdout, stderr });
			});
		},
	);
}

test("built CLI serves ls-impl skill markdown and chunks", {
	timeout: 120_000,
}, async () => {
	await runBuild();

	const load = await runCli(["skill", "ls-impl"]);
	expect(load.code).toBe(0);
	expect(load.stderr).toBe("");
	expect(load.stdout).toContain("# Liminal Spec: ls-impl");
	expect(load.stdout).toContain("## Auto-Generated Skill Directory");
	expect(load.stdout.trim()).not.toMatch(/^\{/);

	const chunk = await runCli([
		"skill",
		"ls-impl",
		"onboarding/01-orientation.md",
		"1",
	]);
	expect(chunk.code).toBe(0);
	expect(chunk.stderr).toBe("");
	expect(chunk.stdout).toContain(
		"# ls-impl / onboarding/01-orientation.md / chunk 1 of 1",
	);
	expect(chunk.stdout).toContain("## Carry Forward");
});
