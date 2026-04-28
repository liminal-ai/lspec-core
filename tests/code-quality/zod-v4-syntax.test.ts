import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { ROOT } from "../test-helpers";

async function sourceFilesUnderSrc(): Promise<string[]> {
	const { readdir } = await import("node:fs/promises");
	const { join } = await import("node:path");

	const files: string[] = [];
	const walk = async (directoryPath: string) => {
		const entries = await readdir(directoryPath, {
			withFileTypes: true,
		});
		for (const entry of entries) {
			const fullPath = join(directoryPath, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (entry.isFile() && entry.name.endsWith(".ts")) {
				files.push(fullPath);
			}
		}
	};

	await walk(join(ROOT, "src"));
	return files;
}

describe("zod v4 syntax", () => {
	test("TC-2.6a no Zod 3-only constructor params remain in src", async () => {
		const files = await sourceFilesUnderSrc();

		for (const filePath of files) {
			const source = await readFile(filePath, "utf8");
			expect(source).not.toContain("errorMap:");
			expect(source).not.toContain("invalid_type_error:");
		}
	});

	test("TC-2.6b top-level string formats are used and no ZodEffects imports remain", async () => {
		const files = await sourceFilesUnderSrc();

		for (const filePath of files) {
			const source = await readFile(filePath, "utf8");
			expect(source).not.toMatch(/z\.string\(\)\.(email|uuid|url)\(/);
			expect(source).not.toContain("ZodEffects");
		}
	});
});
