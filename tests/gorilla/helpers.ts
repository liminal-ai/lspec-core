import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { expect } from "vitest";

import { resetFixture } from "../../gorilla/reset.js";
import { inspect } from "../../src/sdk/operations/inspect.js";
import { ROOT } from "../test-helpers";

export const GORILLA_ROOT = resolve(ROOT, "gorilla");
export const GORILLA_FIXTURE_ROOT = resolve(GORILLA_ROOT, "fixture-spec-pack");
export const GORILLA_BASELINE_ROOT = resolve(
	GORILLA_ROOT,
	".baseline/fixture-spec-pack",
);
export const GORILLA_PROMPT_PATH = resolve(GORILLA_ROOT, "prompt.md");
export const GORILLA_TEMPLATE_PATH = resolve(
	GORILLA_ROOT,
	"evidence-template.md",
);
export const GORILLA_EXAMPLE_EVIDENCE_PATH = resolve(
	GORILLA_ROOT,
	"examples/claude-code-smoke.example.md",
);
export const GORILLA_README_PATH = resolve(GORILLA_ROOT, "README.md");
export const GORILLA_EVIDENCE_DIR = resolve(GORILLA_ROOT, "evidence");
export const GORILLA_SELF_TEST_LOG_PATH = resolve(
	GORILLA_ROOT,
	"self-test-log.md",
);

async function collectFiles(
	root: string,
	current = root,
): Promise<Array<{ path: string; digest: string }>> {
	const entries = await readdir(current, { withFileTypes: true });
	const files: Array<{ path: string; digest: string }> = [];

	for (const entry of entries) {
		const fullPath = join(current, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectFiles(root, fullPath)));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const buffer = await readFile(fullPath);
		files.push({
			path: relative(root, fullPath),
			digest: createHash("sha256").update(buffer).digest("hex"),
		});
	}

	return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function fixtureSnapshot() {
	return await collectFiles(GORILLA_FIXTURE_ROOT);
}

export async function baselineSnapshot() {
	return await collectFiles(GORILLA_BASELINE_ROOT);
}

export async function expectFixtureMatchesBaseline() {
	expect(await fixtureSnapshot()).toEqual(await baselineSnapshot());
}

export async function withFreshFixture<T>(
	callback: () => Promise<T>,
): Promise<T> {
	await resetFixture();
	try {
		return await callback();
	} finally {
		await resetFixture();
	}
}

export async function inspectGorillaFixture() {
	return await inspect({
		specPackRoot: GORILLA_FIXTURE_ROOT,
	});
}
