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
					/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\.\s*(includes|startsWith|endsWith|match|search)\s*\(/g,
				),
			];

			for (const match of sourceMatches) {
				const receiver = match[1] ?? "";
				if (isErrorClassificationReceiver(receiver)) {
					matches.push(`${path}: ${match[0]}`);
				}
			}

			const regexTestMatches = [
				...source.matchAll(
					/\b([A-Za-z_$][\w$]*)\s*\.\s*test\s*\(\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/g,
				),
			];

			for (const match of regexTestMatches) {
				const receiver = match[2] ?? "";
				if (
					isErrorClassificationReceiver(receiver) &&
					!isProviderPreflightStderrException(path, source, match.index ?? 0)
				) {
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

function isProviderPreflightStderrException(
	path: string,
	source: string,
	index: number,
): boolean {
	if (!path.endsWith("src/core/provider-checks.ts")) {
		return false;
	}

	const functionStart = source.lastIndexOf(
		"function providerPreflightStderrMatches",
		index,
	);
	if (functionStart < 0) {
		return false;
	}

	const nextFunction = source.indexOf("\nfunction ", functionStart + 1);
	return nextFunction < 0 || index < nextFunction;
}
