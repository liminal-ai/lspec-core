import { readFile } from "node:fs/promises";

import { expect, test } from "vitest";

import {
	GORILLA_EXAMPLE_EVIDENCE_PATH,
	GORILLA_TEMPLATE_PATH,
} from "./helpers";

function expectSection(content: string, heading: string) {
	const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	expect(content).toMatch(new RegExp(`^## ${escapedHeading}$`, "m"));
}

test("TC-5.7a: evidence template captures required axes", async () => {
	const template = await readFile(GORILLA_TEMPLATE_PATH, "utf8");

	for (const heading of [
		"Operations Invoked",
		"Envelope Returned",
		"Artifact Verified",
		"Continuation Handle Exercised",
		"Divergences",
	]) {
		expectSection(template, heading);
	}
});

test("TC-5.7b: sample evidence report populates the required sections", async () => {
	const example = await readFile(GORILLA_EXAMPLE_EVIDENCE_PATH, "utf8");

	for (const heading of [
		"Scenario",
		"Operations Invoked",
		"Envelope Returned",
		"Artifact Verified",
		"Continuation Handle Exercised",
		"Divergences",
		"Next Step",
	]) {
		expectSection(example, heading);
	}

	expect(example).toContain("Status: ok");
	expect(example).toContain("Exists on disk: yes");
	expect(example).toContain("Unexpected behaviors observed: none");
});
