import { describe, expect, test } from "vitest";

import { loadSkill, readSkillChunk } from "../../../src/sdk/index";

function listedSkillCommands(markdown: string): string[] {
	return [...markdown.matchAll(/`(lbuild-impl skill ls-impl [^`]+)`/g)].map(
		(match) => match[1] as string,
	);
}

describe("CLI-delivered skill SDK", () => {
	test("loads the ls-impl skill with a generated delivery map", () => {
		const load = loadSkill({ skillName: "ls-impl" });

		expect(load.markdown).toContain("# Liminal Spec: ls-impl");
		expect(load.markdown).toContain("## Auto-Generated Skill Directory");
		expect(load.markdown).toContain("400-line chunks");
		expect(load.markdown).toContain(
			"lbuild-impl skill ls-impl onboarding/01-orientation.md 1",
		);
		expect(load.files.some((file) => file.path === "SKILL.md")).toBe(true);
	});

	test("every listed chunk command resolves through the SDK", () => {
		const load = loadSkill({ skillName: "ls-impl" });
		const commands = listedSkillCommands(load.markdown);

		expect(commands.length).toBeGreaterThan(0);
		for (const command of commands) {
			const [, , skillName, path, chunk] = command.split(" ");
			const result = readSkillChunk({
				skillName: skillName ?? "",
				path: path ?? "",
				chunkNumber: Number(chunk),
			});

			expect(result.markdown).toContain(`# ${skillName} / ${path} / chunk`);
			expect(result.lineStart).toBeGreaterThan(0);
			expect(result.lineEnd).toBeGreaterThanOrEqual(result.lineStart);
		}
	});

	test("chunk output includes bounded onboarding wrapper and recovery command", () => {
		const result = readSkillChunk({
			skillName: "ls-impl",
			path: "onboarding/01-orientation.md",
			chunkNumber: 1,
		});

		expect(result.markdown).toContain(
			"# ls-impl / onboarding/01-orientation.md / chunk 1",
		);
		expect(result.markdown).toContain("## Carry Forward");
		expect(result.markdown).toContain("lbuild-impl skill ls-impl");
		expect(result.nextCommand).toBeUndefined();
		expect(result.lineEnd - result.lineStart + 1).toBeLessThanOrEqual(600);
	});

	test("rejects invalid skill paths and chunks", () => {
		expect(() =>
			readSkillChunk({
				skillName: "ls-impl",
				path: "../SKILL.md",
				chunkNumber: 1,
			}),
		).toThrow("Invalid skill path");

		expect(() =>
			readSkillChunk({
				skillName: "ls-impl",
				path: "onboarding/01-orientation.md",
				chunkNumber: 99,
			}),
		).toThrow("Invalid chunk");
	});
});
