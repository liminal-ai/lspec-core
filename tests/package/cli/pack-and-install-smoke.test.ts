import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");

test("TC-3.5b: packed tarball runs through npx after install", {
	timeout: 120_000,
}, async () => {
	await new Promise<void>((resolveRun, reject) => {
		const child = spawn("npm", ["run", "pack-and-install-smoke"], {
			cwd: ROOT,
			env: {
				...process.env,
				FORCE_COLOR: "0",
			},
		});
		let stderr = "";
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolveRun();
				return;
			}

			reject(
				new Error(
					`npm run pack-and-install-smoke exited with code ${code}\n${stderr}`,
				),
			);
		});
	});

	expect(true).toBe(true);
});
