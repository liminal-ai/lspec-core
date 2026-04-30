import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { test } from "vitest";

import { resetFixture } from "../../../gorilla/reset.js";
import {
	GORILLA_FIXTURE_ROOT,
	expectFixtureMatchesBaseline,
	withFreshFixture,
} from "./helpers";

test("TC-5.5a: reset returns fixture to baseline", async () => {
	await withFreshFixture(async () => {
		await writeFile(join(GORILLA_FIXTURE_ROOT, "epic.md"), "# Mutated epic\n");
		await rm(join(GORILLA_FIXTURE_ROOT, "test-plan.md"));
		await mkdir(join(GORILLA_FIXTURE_ROOT, "scratch"), { recursive: true });
		await writeFile(
			join(GORILLA_FIXTURE_ROOT, "scratch", "leftover.txt"),
			"temporary drift\n",
		);

		await resetFixture();
		await expectFixtureMatchesBaseline();
	});
});

test("reset is idempotent", async () => {
	await withFreshFixture(async () => {
		await resetFixture();
		await resetFixture();
		await expectFixtureMatchesBaseline();
	});
});
