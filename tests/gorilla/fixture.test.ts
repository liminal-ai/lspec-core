import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import {
	GORILLA_FIXTURE_ROOT,
	inspectGorillaFixture,
	withFreshFixture,
} from "./helpers";

test("TC-5.4a: fixture present and complete in source", async () => {
	const stories = await readdir(join(GORILLA_FIXTURE_ROOT, "stories"));

	expect(
		stories.filter((entry) => entry.endsWith(".md")).length,
	).toBeGreaterThan(0);
	expect(
		await readdir(join(GORILLA_FIXTURE_ROOT, "target-codebase")),
	).toContain("package.json");
	expect(await readdir(GORILLA_FIXTURE_ROOT)).toEqual(
		expect.arrayContaining([
			"epic.md",
			"tech-design.md",
			"test-plan.md",
			"stories",
			"target-codebase",
		]),
	);
});

test("fixture validates with inspect", async () => {
	await withFreshFixture(async () => {
		const envelope = await inspectGorillaFixture();

		expect(envelope.status).toBe("ok");
		expect(envelope.outcome).toBe("ready");
		expect(envelope.result?.stories.map((story) => story.id)).toEqual([
			"00-foundation",
			"01-structured-output-hardening",
			"02-release-evidence-polish",
		]);
	});
});
