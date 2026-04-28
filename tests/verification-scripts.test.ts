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

		expect(scripts.verify).toBe("npm run red-verify && npm run test");
	});

	test("TC-1.3b: green-verify adds the immutability guard", async () => {
		const scripts = await readScripts();

		expect(scripts["green-verify"]).toBe(
			"npm run verify && npm run guard:no-test-changes",
		);
	});

	test("TC-1.3b: verify-all remains a clear Story 0 placeholder for integration", async () => {
		const scripts = await readScripts();

		expect(scripts["verify-all"]).toContain("npm run verify");
		expect(scripts["verify-all"]).toContain(
			"integration suite not yet present",
		);
	});
});
