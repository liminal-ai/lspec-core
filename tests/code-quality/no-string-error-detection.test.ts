import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "../test-helpers";

test("TC-4.2b: non-test code does not branch on error-message substrings", async () => {
	const sourceFiles = ["src/sdk/operations", "src/cli/commands", "src/core"];
	const matches: string[] = [];

	for (const relativeDir of sourceFiles) {
		const command = `find ${join(ROOT, relativeDir)} -name '*.ts' -type f`;
		const { execSync } = await import("node:child_process");
		const paths = execSync(command, {
			encoding: "utf8",
		})
			.trim()
			.split("\n")
			.filter(Boolean);

		for (const path of paths) {
			const source = await readFile(path, "utf8");
			const sourceMatches = [
				...source.matchAll(
					/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\.\s*(includes|startsWith|endsWith|match)\s*\(/g,
				),
			];

			for (const match of sourceMatches) {
				const receiver = match[1] ?? "";
				if (isErrorClassificationReceiver(receiver)) {
					matches.push(`${path}: ${match[0]}`);
				}
			}
		}
	}

	expect(matches).toEqual([]);
});

function isErrorClassificationReceiver(receiver: string): boolean {
	return /(^|\.)(stderr|stdout|blocker|output|message)$|err\.message$|error\.message$|Error$|error$/i.test(
		receiver,
	);
}
