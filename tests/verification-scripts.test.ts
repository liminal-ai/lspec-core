import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");

async function readScripts(): Promise<Record<string, string>> {
	const pkg = JSON.parse(
		await readFile(join(ROOT, "package.json"), "utf8"),
	) as {
		scripts: Record<string, string>;
	};

	return pkg.scripts;
}

describe("verification scripts", () => {
	test("TC-1.3b: red-verify runs format, lint, typecheck, and baseline capture", async () => {
		const scripts = await readScripts();

		expect(scripts["red-verify"]).toBe(
			"npm run format:check && npm run lint && npm run typecheck && npm run capture:test-baseline",
		);
	});

	test("TC-1.3b: verify adds the test suite", async () => {
		const scripts = await readScripts();

		expect(scripts.test).toBe("vitest run --project default");
		expect(scripts.verify).toBe("npm run red-verify && npm run test");
	});

	test("TC-1.3b: green-verify adds the immutability guard", async () => {
		const scripts = await readScripts();

		expect(scripts["green-verify"]).toBe(
			"npm run verify && npm run guard:no-test-changes",
		);
	});

	test("TC-1.3b: verify-all adds the package and integration projects", async () => {
		const scripts = await readScripts();

		expect(scripts["test:package"]).toBe("vitest run --project package");
		expect(scripts["test:integration"]).toBe(
			"vitest run --project integration",
		);
		expect(scripts["verify-all"]).toBe(
			"npm run verify && npm run test:package && npm run test:integration",
		);
	});
});
