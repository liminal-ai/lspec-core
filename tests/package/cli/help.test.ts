import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");
const CLI_PATH = resolve(ROOT, "dist/bin/lbuild-impl.js");
const EXPECTED_SUBCOMMANDS = [
	"inspect",
	"preflight",
	"epic-synthesize",
	"epic-verify",
	"epic-cleanup",
	"quick-fix",
	"story-implement",
	"story-continue",
	"story-self-review",
	"story-verify",
];

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

test("TC-3.1a: --help lists all ten subcommands", {
	timeout: 120_000,
}, async () => {
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

	const run = await runCli(["--help"]);

	expect(run.code).toBe(0);
	expect(run.stderr).toBe("");
	for (const subcommand of EXPECTED_SUBCOMMANDS) {
		expect(run.stdout).toContain(subcommand);
	}
});
