import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { ROOT } from "../test-helpers";

const FIXTURE_ROOT = join(ROOT, "tests/parser-contract/fixtures");
const PROVIDERS = ["claude-code", "codex", "copilot"] as const;

describe("parser-contract fixture provenance", () => {
	test("TC-4.8b: fixture directories exist for every provider", async () => {
		const entries = await readdir(FIXTURE_ROOT);
		expect(entries.sort()).toEqual(PROVIDERS.slice().sort());
	});

	test("TC-4.8b: any committed fixture declares provenance metadata", async () => {
		for (const provider of PROVIDERS) {
			const providerDir = join(FIXTURE_ROOT, provider);
			const entries = (await readdir(providerDir)).filter(
				(name) => name !== ".gitkeep",
			);

			for (const entry of entries) {
				const fixture = await readFile(join(providerDir, entry), "utf8");
				expect(fixture).toMatch(
					/^# Provider: .+\n# Command: .+\n# Captured: \d{4}-\d{2}-\d{2}/,
				);
			}
		}
	});
});
