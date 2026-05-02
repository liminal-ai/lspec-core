import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "../../support/test-helpers";

async function readSkillFile(path: string): Promise<string> {
	return await readFile(join(ROOT, path), "utf8");
}

test("TC-4.3a documents Codex heartbeat monitoring guidance without implying final while work is active", async () => {
	const [operatingModel, storyCycle, cliOperations] = await Promise.all([
		readSkillFile("src/skills/ls-impl/onboarding/03-operating-model.md"),
		readSkillFile("src/skills/ls-impl/phases/20-story-cycle.md"),
		readSkillFile("src/skills/ls-impl/operations/30-cli-operations.md"),
	]);

	expect(operatingModel).toContain("keep the original exec session open");
	expect(operatingModel).toContain("poll it again with empty input");
	expect(operatingModel).toContain(
		"do not final while the command still reports itself as running",
	);
	expect(storyCycle).toContain("keep the same exec session open");
	expect(storyCycle).toContain("poll again with empty input");
	expect(cliOperations).toContain(
		"poll with empty input on the heartbeat cadence",
	);
});

test("TC-4.3b scopes Claude Code Monitor guidance to Claude Code instead of Codex", async () => {
	const [operatingModel, storyCycle, cliOperations] = await Promise.all([
		readSkillFile("src/skills/ls-impl/onboarding/03-operating-model.md"),
		readSkillFile("src/skills/ls-impl/phases/20-story-cycle.md"),
		readSkillFile("src/skills/ls-impl/operations/30-cli-operations.md"),
	]);

	expect(operatingModel).toContain("use Monitor when it is available");
	expect(storyCycle).toContain("Monitor may be used when available");
	expect(storyCycle).toContain("do not assume that Monitor exists in Codex");
	expect(cliOperations).toContain("In Claude Code, use Monitor when available");
});
