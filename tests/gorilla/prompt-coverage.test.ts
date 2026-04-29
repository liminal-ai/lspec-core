import { readFile } from "node:fs/promises";

import { expect, test } from "vitest";

import { GORILLA_PROMPT_PATH } from "./helpers";

test("TC-5.6a: prompt covers every operation", async () => {
	const prompt = await readFile(GORILLA_PROMPT_PATH, "utf8");

	for (const operation of [
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
	]) {
		expect(prompt).toContain(operation);
	}
});

test("TC-5.6b: prompt covers each provider for provider-consuming operations", async () => {
	const prompt = await readFile(GORILLA_PROMPT_PATH, "utf8");

	expect(prompt).toContain("claude-code");
	expect(prompt).toContain("codex");
	expect(prompt).toContain("copilot");
});
