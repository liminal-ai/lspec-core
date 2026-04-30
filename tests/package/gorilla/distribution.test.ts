import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "../../..");

test("TC-5.4b: fixture excluded from published tarball", async () => {
	const { stdout: packStdout } = await execFileAsync(
		"npm",
		["pack", "--json"],
		{
			cwd: ROOT,
		},
	);
	const packResult = JSON.parse(packStdout) as Array<{ filename: string }>;
	const tarballName = packResult[0]?.filename;

	expect(tarballName).toBeTruthy();
	if (!tarballName) {
		throw new Error("npm pack did not produce a tarball filename");
	}

	try {
		const { stdout } = await execFileAsync("tar", ["-tf", tarballName], {
			cwd: ROOT,
		});
		expect(stdout).not.toContain("package/gorilla/");
	} finally {
		if (tarballName) {
			await rm(resolve(ROOT, tarballName), { force: true });
		}
	}
});
